import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../../models/user/user.model";
import {
  formatAdminUserDetailResponse,
  formatAdminUserResponse,
  formatUserResponse,
  genVerificationCode,
  getSysUserId,
  isPresent,
} from "../../utils/utils";
import type {
  AdminUserDetailResponse,
  AdminUserListResponse,
  AdminUserResponse,
  SuccessResponse,
  UserCreate,
  UserResponse,
  UserSearchQuery,
  UserSelfPasswordSet,
  UserUpdate,
  UserContactInfoUpdate,
  UserEmailUpdate,
  UserPhoneNumberUpdate,
  UserSelfGeneralInfoUpdate,
  UserSelfPasswordUpdate,
  UserBulkDelete,
} from "../../../common/types.common";
import { HttpError } from "../../utils/errorHandler";
import bcrypt from "bcryptjs";
import {
  DEFAULT_SEARCH_LIMIT,
  HASH_SALT,
  JWT_NAME,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import {
  sendEmailChangeEmail,
  sendEmailVerifiedEmail,
  sendLockAccountChangeEmail,
  sendPhoneNumberChangeEmail,
  sendPhoneNumberVerifiedEmail,
  sendVerificationEmail,
} from "../../utils/email";
import {
  sendLockAccountChangeSms,
  sendPhoneNumberChangeSms,
  sendPhoneNumberVerifiedSms,
  sendVerificationSms,
} from "../../utils/twilio";
import mongoose, { Types } from "mongoose";
import { deleteFileFromFirebaseStorage } from "../../utils/firebase";
import Otp from "../../models/user/otp.model";
import PasswordResetToken from "../../models/user/passwordResetToken.model";
import {
  MAX_USERS_TO_DELETE_BULK,
  VERIFICATION_CODE_TTL,
} from "../../../common/configs.common";
import Role from "../../models/role/role.model";
import Order from "../../models/order/order.model";
import UserPaymentMethod from "../../models/user/userPaymentMethod.model";
import UserAddress from "../../models/user/userAddress.model";
import Cart from "../../models/user/cart.model";
import Provider from "../../models/inventory/provider.model";
import Grn from "../../models/inventory/grn.model";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import Product from "../../models/product/product.model";
import ProductBrand from "../../models/product/productBrand.model";
import ProductCategory from "../../models/product/productCategory.model";
import ProductOs from "../../models/product/productOs.model";
import ProductModel from "../../models/product/productModel.model";
import ModelVariation from "../../models/product/modelVariation.model";
import stripe from "../../configs/stripe.config";
import { formatError } from "../../../common/utils.common";

// --- ADMIN FUNCTIONS ---
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user request...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const {
    fullName,
    avatarUrl,
    email,
    isEmailVerified,
    phoneNumber,
    isPhoneNumberVerified,
    password,
    birth,
    gender,
    isLocked,
    roleIds,
  } = req.body as UserCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Business logic
    if (new Date(birth) > new Date()) {
      throw new HttpError(400, "Birth date cannot be in the future.");
    }

    if (!email && isEmailVerified) {
      throw new HttpError(
        400,
        "Email cannot be empty when isEmailVerified is true."
      );
    }
    if (!phoneNumber && isPhoneNumberVerified) {
      throw new HttpError(
        400,
        "Phone number cannot be empty when isPhoneNumberVerified is true."
      );
    }

    // Check if email or phone number already exists
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const existingUser = await User.exists({
      isDeleted: false,
      $or: orConditions,
    })
      .lean()
      .session(session);
    if (existingUser) {
      throw new HttpError(409, "Email or phone number already exists.");
    }

    // Check and update Role collection
    let roles: { id: Types.ObjectId; assignedBy: Types.ObjectId }[] = [];
    if (roleIds && roleIds.length > 0) {
      const roleCount = await Role.countDocuments({
        _id: { $in: roleIds },
      }).session(session);
      if (roleCount !== roleIds.length) {
        throw new HttpError(400, "One or more roles do not exist.");
      }

      await Role.updateMany(
        { _id: { $in: roleIds } },
        { $inc: { userAssigned: 1 } },
        { session }
      );

      const reqUserIdObjId = new Types.ObjectId(reqUserId);
      roles = roleIds.map((id) => ({
        id: new Types.ObjectId(id),
        assignedBy: reqUserIdObjId,
      }));
    }

    const hashedPassword = await bcrypt.hash(password, HASH_SALT);
    const user = new User({
      fullName,
      avatarUrl: avatarUrl || null,
      email,
      isEmailVerified,
      phoneNumber,
      isPhoneNumberVerified,
      password: hashedPassword,
      birth,
      gender,
      isLocked: isLocked !== undefined ? isLocked : false,
      roles,
    });

    await user.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: formatAdminUserResponse(user),
    } as SuccessResponse<AdminUserResponse>);
    console.log("✅", "User created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user request...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).lean();
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }
    // Prevent from retrieving system user
    if (getSysUserId().equals(user._id)) {
      throw new HttpError(404, "User not found.");
    }

    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: formatAdminUserResponse(user),
    } as SuccessResponse<AdminUserResponse>);
    console.log("✅", "User retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getSystemUserId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get system user ID request...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  try {
    res.status(200).json({
      success: true,
      message: "System user ID retrieved successfully",
      data: { sysUserId: getSysUserId().toString() },
    } as SuccessResponse<{ sysUserId: string }>);
    console.log("✅", "System user ID retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user details request...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId)
      .populate(["addresses", "paymentMethods", "bankAccounts"])
      .lean({ virtuals: true }); // Also apply POJO with virtuals
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }
    // Prevent from retrieving system user
    if (getSysUserId().equals(user._id)) {
      throw new HttpError(404, "User not found.");
    }

    res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
      data: formatAdminUserDetailResponse(user),
    } as SuccessResponse<AdminUserDetailResponse>);
    console.log("✅", "User details retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing search users request...");
  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const reqQuery = req["sanitizedQuery"] as UserSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {
    _id: { $ne: getSysUserId() }, // Prevent system user from being retrieved
  };

  const searchTerm = reqQuery.searchTerm;
  if (searchTerm) {
    query.$or = [
      { id: { $regex: searchTerm } },
      { fullName: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } },
      { phoneNumber: { $regex: `^${searchTerm}`, $options: "i" } },
    ];
  }

  if (reqQuery.isEmailVerified) {
    query.isEmailVerified = reqQuery.isEmailVerified === "true";
  }
  if (reqQuery.isPhoneNumberVerified) {
    query.isPhoneNumberVerified = reqQuery.isPhoneNumberVerified === "true";
  }
  if (reqQuery.isLocked) {
    query.isLocked = reqQuery.isLocked === "true";
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await User.aggregate([
      { $match: { isDeleted: false, ...query } },
      { ...OPTIMIZE_PIPELINE },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const users: AdminUserResponse[] = aggregationResult[0].data.map(
      (user: any) => formatAdminUserResponse(user)
    );
    const total = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        total,
        users: {
          total: users.length,
          users,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminUserListResponse>);
    console.log("✅", "Users retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function updateGeneralInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;
  if (userId === reqUserId) {
    return next(
      new HttpError(400, "You cannot update your own account as an admin.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    // Business logic
    const updateData = req.body as UserUpdate;

    const updatedBirth = updateData.birth
      ? new Date(updateData.birth)
      : user.birth;
    if (updatedBirth !== user.birth && updatedBirth > new Date()) {
      throw new HttpError(400, "Birth date cannot be in the future.");
    }

    const updatedAvatarUrl =
      updateData.avatarUrl === null
        ? null
        : updateData.avatarUrl || (user.avatarUrl as string | null);
    const updatedPassword = updateData.password
      ? await bcrypt.hash(updateData.password, HASH_SALT)
      : user.password;
    const updatedIsLocked = updateData.isLocked ?? (user.isLocked as boolean);

    if (user.avatarUrl !== updatedAvatarUrl && user.avatarUrl) {
      await deleteFileFromFirebaseStorage(user.avatarUrl, "user-avatar");
    }

    const updatedRoleIds = updateData.roleIds;
    if (updatedRoleIds === null) {
      // If roleIds is null, remove all roles
      if (user.roles && user.roles.length > 0) {
        const roleIdsToRemove = user.roles.map((role) => role.id);
        await Role.updateMany(
          { _id: { $in: roleIdsToRemove } },
          { $inc: { userAssigned: -1 } },
          { session }
        );
        user.roles.splice(0, user.roles.length); // Clear roles
      }
    } else if (updatedRoleIds) {
      const currentRoleIds = user.roles!.map(
        (role) => role.id.toString() as string
      );

      const rolesToAdd = updatedRoleIds.filter(
        (id) => !currentRoleIds.includes(id)
      );
      const rolesToRemove = currentRoleIds.filter(
        (id) => !updatedRoleIds.includes(id)
      );

      if (rolesToAdd.length > 0) {
        const roleCount = await Role.countDocuments({
          _id: { $in: rolesToAdd },
        }).session(session);
        if (roleCount !== rolesToAdd.length) {
          throw new HttpError(400, "One or more roles do not exist.");
        }

        await Role.updateMany(
          { _id: { $in: rolesToAdd } },
          { $inc: { userAssigned: 1 } },
          { session }
        );

        const reqUserIdObjId = new Types.ObjectId(reqUserId);
        user.roles.push(
          ...rolesToAdd.map((id) => ({
            id: new Types.ObjectId(id),
            assignedBy: reqUserIdObjId,
            assignedAt: new Date(),
          }))
        );
      }

      if (rolesToRemove.length > 0) {
        await Role.updateMany(
          { _id: { $in: rolesToRemove } },
          { $inc: { userAssigned: -1 } },
          { session }
        );
        rolesToRemove.forEach((removeId) => {
          user.roles = user.roles.filter((role) => !role.id.equals(removeId));
        });
      }
    }

    // Save changes
    const oldIsLocked = user.isLocked; // For notification

    user.fullName = updateData.fullName || user.fullName;
    user.avatarUrl = updatedAvatarUrl;
    user.password = updatedPassword;
    user.birth = updatedBirth;
    user.gender = updateData.gender || user.gender;
    user.userBalanceCents =
      updateData.userBalanceCents || user.userBalanceCents;
    user.isLocked = updatedIsLocked;

    await user.save({ session });

    if (oldIsLocked !== updatedIsLocked) {
      if (user.email) {
        await sendLockAccountChangeEmail(
          user.email,
          user.fullName,
          updatedIsLocked
        );
      } else if (user.phoneNumber) {
        await sendLockAccountChangeSms(user.phoneNumber, updatedIsLocked);
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: formatAdminUserResponse(user),
    } as SuccessResponse<AdminUserResponse>);
    console.log("✅", "User updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updateEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user email request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "reqUserId or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;
  if (userId === reqUserId) {
    return next(
      new HttpError(400, "You cannot update your own email as an admin.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    // Business logic
    const { email, isEmailVerified } = req.body as UserEmailUpdate;
    const updatedEmail = email || user.email;
    const updatedIsEmailVerified =
      isEmailVerified ?? (user.isEmailVerified as boolean);

    const existingUser = await User.findOne({
      _id: { $ne: user._id }, // Exclude current user
      email: updatedEmail,
      isDeleted: false,
    })
      .lean()
      .session(session);
    if (existingUser) {
      throw new HttpError(409, "Email already exists.");
    }

    if (!updatedEmail && updatedIsEmailVerified) {
      throw new HttpError(
        400,
        "Email cannot be empty when isEmailVerified is true."
      );
    }

    // Save changes
    const oldEmail = user.email; // For notification
    const oldIsEmailVerified = user.isEmailVerified; // For notification
    user.email = updatedEmail;
    user.isEmailVerified = updatedIsEmailVerified;

    // Update stripeCustomerId if email changed and isEmailVerified is true
    if (
      user.stripeCustomerId &&
      oldEmail !== updatedEmail &&
      updatedEmail &&
      updatedIsEmailVerified
    ) {
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          email: updatedEmail,
        });
        console.log("✅ ", "Stripe customer email updated successfully.");
      } catch (error) {
        console.error("❌ ", "Error updating Stripe customer email:", error);
      }
    }

    await user.save({ session });

    // Send changes notification
    /*
      Email changed from:
        - undefined -> email
        - email -> diff email
        - email -> undefined
    */
    if (oldEmail !== updatedEmail) {
      const recipients = oldEmail ? [oldEmail] : [];
      if (updatedEmail) recipients.push(updatedEmail);
      await sendEmailChangeEmail(
        recipients,
        oldEmail || "No email",
        updatedEmail || "No email",
        user.fullName,
        updatedIsEmailVerified
      );
      /*
        Verification changed from:
          - Has email: true -> false, false -> true
      */
    } else if (oldIsEmailVerified !== updatedIsEmailVerified) {
      // Email not changed but verification changed
      await sendEmailVerifiedEmail(
        updatedEmail as string,
        user.fullName,
        updatedIsEmailVerified
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "User email updated successfully",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "User email updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updatePhoneNumber(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user phone number request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "reqUserId or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;
  if (userId === reqUserId) {
    return next(
      new HttpError(400, "You cannot update your own phone number as an admin.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    // Business logic
    const { phoneNumber, isPhoneNumberVerified } =
      req.body as UserPhoneNumberUpdate;

    const updatedPhoneNumber =
      phoneNumber === null ? null : phoneNumber || user.phoneNumber;
    const updatedIsPhoneNumberVerified =
      isPhoneNumberVerified ?? (user.isPhoneNumberVerified as boolean);

    const existingUser = await User.findOne({
      _id: { $ne: user._id }, // Exclude current user
      phoneNumber: updatedPhoneNumber,
      isDeleted: false,
    })
      .lean()
      .session(session);
    if (existingUser) {
      throw new HttpError(409, "Phone number already exists.");
    }

    if (!updatedPhoneNumber && updatedIsPhoneNumberVerified) {
      throw new HttpError(
        400,
        "Phone number cannot be empty when isPhoneNumberVerified is true."
      );
    }

    // Save changes
    const oldPhoneNumber = user.phoneNumber; // For notification
    const oldIsPhoneNumberVerified = user.isPhoneNumberVerified; // For notification
    user.phoneNumber = updatedPhoneNumber;
    user.isPhoneNumberVerified = updatedIsPhoneNumberVerified;

    // Update stripeCustomerId if phone number changed and isPhoneNumberVerified is true
    if (
      user.stripeCustomerId &&
      oldPhoneNumber !== updatedPhoneNumber &&
      updatedPhoneNumber &&
      updatedIsPhoneNumberVerified
    ) {
      try {
        await stripe.customers.update(user.stripeCustomerId, {
          phone: updatedPhoneNumber,
        });
        console.log("✅ ", "Stripe customer phone updated successfully.");
      } catch (error) {
        console.error("❌ ", "Error updating Stripe customer phone:", error);
      }
    }

    await user.save({ session });

    // Send changes notification, priority send by email if has
    /*
      Phone number changed from:
        - undefined -> phone number
        - phone number -> diff phone number
        - phone number -> undefined
    */
    if (oldPhoneNumber !== updatedPhoneNumber) {
      if (user.email) {
        await sendPhoneNumberChangeEmail(
          user.email,
          oldPhoneNumber || "No phone number",
          updatedPhoneNumber || "No phone number",
          user.fullName,
          updatedIsPhoneNumberVerified
        );
      } else {
        const recipients = oldPhoneNumber ? [oldPhoneNumber] : [];
        if (updatedPhoneNumber) recipients.push(updatedPhoneNumber as string);
        await sendPhoneNumberChangeSms(
          recipients,
          oldPhoneNumber || "No phone number",
          updatedPhoneNumber || "No phone number",
          updatedIsPhoneNumberVerified
        );
      }
      /*
     Verification changed from:
      - Has phone number: true -> false, false -> true
    */
    } else if (oldIsPhoneNumberVerified !== updatedIsPhoneNumberVerified) {
      if (user.email) {
        await sendPhoneNumberVerifiedEmail(
          user.email,
          user.fullName,
          updatedIsPhoneNumberVerified
        );
      } else {
        await sendPhoneNumberVerifiedSms(
          updatedPhoneNumber as string,
          user.fullName,
          updatedIsPhoneNumberVerified
        );
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "User phone number updated successfully",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "User phone number updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing delete user request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;
  if (reqUserId === userId) {
    return next(
      new HttpError(400, "You cannot delete your own account as an admin.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    await executeDeletion(user, new Types.ObjectId(reqUserId), session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    } as SuccessResponse);
    console.log("✅", "User deleted successfully.");
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing bulk delete users request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userIds: userIdsToDelete } = req.body as UserBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (userIdsToDelete.length > MAX_USERS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_USERS_TO_DELETE_BULK} users at once.`
      );
    }

    // Cannot delete self
    if (userIdsToDelete.includes(reqUserId)) {
      throw new HttpError(
        400,
        "You cannot delete your own account as an admin."
      );
    }

    // Delete users, if user not found -> skip and continue
    for (const id of userIdsToDelete) {
      const user = Types.ObjectId.isValid(id)
        ? await User.findById(id).session(session)
        : null;
      if (user && !user.isDeleted) {
        await executeDeletion(user, new Types.ObjectId(reqUserId), session);
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Users deleted successfully",
    } as SuccessResponse);
    console.log("✅", "Users deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- BUYER FUNCTIONS ---
export async function updateSelfContactInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user contact info request...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }

  // Check only buyer perform this action
  if (!isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { value, type } = req.body as UserContactInfoUpdate;
  const user = req["user"];
  if (!user) {
    return next(
      new HttpError(
        500,
        "User data not found, this should be handled by middlewares."
      )
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Business logic
    // If updated email/phone exists in another user -> return error and prompt to login that account to change or delete it
    // If both isEmailVerified and isPhoneNumberVerified are false -> return error and prompt to verify at least one of them
    const existingUser = await User.findOne({
      _id: { $ne: user._id }, // Exclude current user
      [type]: value,
      isDeleted: false,
    })
      .lean()
      .session(session);
    if (existingUser) {
      throw new HttpError(
        409,
        `${type} already exists in another account. If you sure this is your ${type},
          we think you has registered an account with this ${type} before.
          If you want to update your ${type} for the current account,
          we recommend you to login with this ${type} first and change or delete the existing account.`
      );
    }

    // Handle no change case
    if (type === "email" && value === user.email && user.isEmailVerified) {
      throw new HttpError(
        400,
        "New email cannot be the same as current email."
      );
    } else if (
      type === "phoneNumber" &&
      value === user.phoneNumber &&
      user.isPhoneNumberVerified
    ) {
      throw new HttpError(
        400,
        "New phone number cannot be the same as current phone number."
      );
    }

    user[type] = value;
    user[type === "email" ? "isEmailVerified" : "isPhoneNumberVerified"] =
      false;
    if (!user.isEmailVerified && !user.isPhoneNumberVerified) {
      throw new HttpError(400, "Please verify at least one contact info.");
    }
    await user.save({ session });

    const verificationCode = genVerificationCode();
    await Otp.create(
      [
        {
          userId,
          type,
          code: verificationCode,
          expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL),
        },
      ],
      { session }
    );

    // Send verification code
    if (type === "email") {
      await sendVerificationEmail(user.fullName, value, verificationCode);
    } else {
      await sendVerificationSms(value, verificationCode);
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `User contact info updated successfully,
        a verification code has been sent to the new email or phone number,
        please verify it.`,
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "User email updated successfully.");
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function deleteSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing delete user request...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (!isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const reqUser = req["user"];
  if (!reqUser) {
    return next(
      new HttpError(
        500,
        "User data not found, this should be handled by middlewares."
      )
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    await executeDeletion(user, reqUser._id, session);

    await session.commitTransaction();

    res
      .clearCookie(JWT_NAME)
      .status(200)
      .json({
        success: true,
        message: "User deleted successfully",
      } as SuccessResponse);
    console.log("✅", "User deleted successfully.");
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- BOTH ADMIN AND BUYER FUNCTIONS ---
export async function getSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get self user request...");

  const [isBuyerOnly, user] = [req["auth"]?.isBuyerOnly, req["user"]];
  if (!isPresent(isBuyerOnly) || !isPresent(user)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly or user not found, this should be handled in middlewares."
      )
    );
  }

  try {
    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: isBuyerOnly
        ? formatUserResponse(user)
        : formatAdminUserResponse(user),
    } as SuccessResponse<UserResponse | AdminUserResponse>);
    console.log("✅", "User retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function updateSelfGeneralInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user request...");
  const user = req["user"];
  if (!user) {
    return next(
      new HttpError(
        500,
        "User data not found, this should be handled by middlewares."
      )
    );
  }

  const { fullName, avatarUrl, birth, gender } =
    req.body as UserSelfGeneralInfoUpdate;

  try {
    // Business logic
    const updatedBirth = birth ? new Date(birth) : (user.birth as Date);
    if (updatedBirth !== user.birth && updatedBirth > new Date()) {
      throw new HttpError(400, "Birth date cannot be in the future.");
    }

    const updatedAvatarUrl =
      avatarUrl === null
        ? null
        : avatarUrl || (user.avatarUrl as string | null);
    if (user.avatarUrl !== updatedAvatarUrl && user.avatarUrl) {
      await deleteFileFromFirebaseStorage(user.avatarUrl, "user-avatar");
    }

    // Save changes
    user.fullName = fullName || user.fullName;
    user.avatarUrl = updatedAvatarUrl;
    user.birth = updatedBirth;
    user.gender = gender || user.gender;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "User updated successfully.");
  } catch (error) {
    next(error);
  }
}

export async function updateSelfPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user password request...");
  const user = req["user"];
  if (!user) {
    return next(
      new HttpError(
        500,
        "User data not found, this should be handled by middlewares."
      )
    );
  }

  const { currentPassword, newPassword } = req.body as UserSelfPasswordUpdate;

  try {
    // Only for user who auth by local
    if (user.authProvider !== "local") {
      throw new HttpError(
        403,
        "This action is not available for accounts created with provider(Google)."
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new HttpError(401, "Current password is incorrect.");
    }

    if (currentPassword === newPassword) {
      throw new HttpError(
        400,
        "New password cannot be the same as current password."
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, HASH_SALT);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User password updated successfully",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "User password updated successfully.");
  } catch (error) {
    next(error);
  }
}

export async function setSelfPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing set user password request...");
  const user = req["user"];
  if (!user) {
    return next(
      new HttpError(
        500,
        "User data not found, this should be handled by middlewares."
      )
    );
  }

  const { password } = req.body as UserSelfPasswordSet;

  try {
    // Only for user who auth by provider
    if (user.authProvider === "local") {
      throw new HttpError(
        403,
        "Password has already been set for this account."
      );
    }

    const hashedPassword = await bcrypt.hash(password, HASH_SALT);
    user.password = hashedPassword;
    user.authProvider = "local";
    await user.save();

    res.status(200).json({
      success: true,
      message: "User password set successfully",
      data: formatUserResponse(user),
    } as SuccessResponse<UserResponse>);
    console.log("✅", "User password set successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(userId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking user constraints...");

  try {
    /**
      None-blocking constraints:
        - Otp
        - PasswordResetToken
        - Cart
        - UserPaymentMethod
        - UserAddress
      Blocking constraints:
        - UserRoles (assignedBy)
        - Roles (createdBy)
        - Order (userId)
        - Provider (createdBy, deletedBy)
        - Grn (createdBy)
        - InventoryMovement (createdBy)
        - Product (createdBy, deletedBy)
        - ProductBrand (createdBy, deletedBy)
        - ProductCategory (createdBy, deletedBy)
        - ProductOs (createdBy, deletedBy)
        - ProductModel (createdBy, deletedBy)
        - VariationColor (createdBy, deletedBy)
        - VariationBand (createdBy, deletedBy)
     */
    const constraintChecks = [
      User.exists({ "roles.assignedBy": userId }),
      Role.exists({
        $or: [{ createdBy: userId }, { "permissions.assignedBy": userId }],
      }),

      Order.exists({ userId }),

      Provider.exists({ $or: [{ createdBy: userId }, { deletedBy: userId }] }),
      Grn.exists({ createdBy: userId }),
      InventoryMovement.exists({ createdBy: userId }),

      Product.exists({ $or: [{ createdBy: userId }, { deletedBy: userId }] }),
      ProductBrand.exists({
        $or: [{ createdBy: userId }, { deletedBy: userId }],
      }),
      ProductCategory.exists({
        $or: [{ createdBy: userId }, { deletedBy: userId }],
      }),
      ProductOs.exists({ $or: [{ createdBy: userId }, { deletedBy: userId }] }),
      ProductModel.exists({
        $or: [{ createdBy: userId }, { deletedBy: userId }],
      }),
      ModelVariation.exists({
        $or: [{ createdBy: userId }, { deletedBy: userId }],
      }),
    ];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for user: ${userId}. Soft delete required.`
      );
    } else {
      console.log(
        `▶️ `,
        `No critical constraints found for user: ${userId}. Hard delete is possible.`
      );
    }

    return hasConstraints;
  } catch (error) {
    throw new Error(formatError(error));
  }
}

async function executeDeletion(
  userToDelete: IUser,
  deletedBy: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  try {
    if (userToDelete.isDeleted) return;

    // Recalculate userAssigned from Roles
    const roleIds = userToDelete.roles.map((role: any) => role.id as string);
    await Role.updateMany(
      { _id: { $in: roleIds } },
      { $inc: { userAssigned: -1 } },
      { session }
    );

    // Anonymizing stripCustomerId if has
    if (userToDelete.stripeCustomerId) {
      try {
        // Bank out personal information to fulfill privacy obligations
        const customerData: {
          name: string;
          email?: string;
          phone?: string;
          address: null;
          shipping: null;
          metadata: {
            appAccountDeleted: "true";
            appAccountDeletedAt: string;
          };
        } = {
          name: `Deleted User ${userToDelete._id}`,
          phone: undefined,
          address: null,
          shipping: null,
          metadata: {
            appAccountDeleted: "true",
            appAccountDeletedAt: new Date().toISOString(),
          },
        };
        if (userToDelete.email && userToDelete.isEmailVerified) {
          customerData["email"] = `deleted-${userToDelete._id}@example.com`; // Unique, non-functional email
        }
        await stripe.customers.update(
          userToDelete.stripeCustomerId,
          customerData
        );
        console.log("✅ ", "Stripe customer data anonymized successfully.");
      } catch (error) {
        console.error("❌ ", "Error anonymizing Stripe customer data:", error);
      }
    }

    // Check for constraints to decide deletion strategy
    if (await hasConstraints(userToDelete._id)) {
      // Soft delete
      await User.findByIdAndUpdate(
        userToDelete._id,
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
          },
        },
        { session }
      );
      return;
    }

    // Hard delete (and cleanup)
    await Promise.all([
      userToDelete.avatarUrl
        ? deleteFileFromFirebaseStorage(userToDelete.avatarUrl, "user-avatar")
        : Promise.resolve(),

      // The pre-delete hook on the User model is a better place for this,
      // but keeping it here is also valid within the transaction.
      Otp.deleteMany({ userId: userToDelete._id }, { session }),
      PasswordResetToken.deleteMany({ userId: userToDelete._id }, { session }),
      Cart.deleteMany({ userId: userToDelete._id }, { session }),
      UserPaymentMethod.deleteMany({ userId: userToDelete._id }, { session }),
      UserAddress.deleteMany({ userId: userToDelete._id }, { session }),
      User.findByIdAndDelete(userToDelete._id, { session }),
    ]);
  } catch (error) {
    throw new Error(formatError(error));
  }
}
