import { Request, Response, NextFunction } from "express";
import User from "../../models/user/user.model";
import {
  formatAdminUserResponse,
  formatUserResponse,
  genVerificationCode,
} from "../../utils/utils";
import {
  AdminUserListResponse,
  AdminUserResponse,
  SuccessResponse,
  UserCreate,
  UserResponse,
  UserUpdate,
  UserUpdateContactInfo,
  UserUpdateEmail,
  UserUpdatePhoneNumber,
} from "../../../common/types.common";
import { errorHandler } from "../../utils/errorHandler";
import bcrypt from "bcryptjs";
import { HASH_SALT, JWT_NAME } from "../../configs/configs";
import {
  sendEmailChangeEmail,
  sendEmailVerifiedEmail,
  sendLockAccountChangeEmail,
  sendPhoneNumberChangeEmail,
  sendPhoneNumberVerifiedEmail,
  sendVerificationEmail,
} from "../../utils/mailtrap";
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
import { VERIFICATION_CODE_TTL } from "../../../common/configs.common";
import { RequestAuth } from "../../utils/types";
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

// --- ADMIN FUNCTIONS ---
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user request...");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      email,
      isEmailVerified,
      phoneNumber,
      isPhoneNumberVerified,
      password,
      roleIds,
    } = req.body as UserCreate;

    // Business logic
    if (!email && isEmailVerified) {
      return next(
        errorHandler(400, "Email cannot be empty when isEmailVerified is true.")
      );
    }
    if (!phoneNumber && isPhoneNumberVerified) {
      return next(
        errorHandler(
          400,
          "Phone number cannot be empty when isPhoneNumberVerified is true."
        )
      );
    }

    // Check if email or phone number already exists
    const orConditions: ({ email: string } | { phoneNumber: string })[] = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });
    const userExists = await User.exists({
      isDeleted: false,
      $or: orConditions,
    }).session(session);
    if (userExists) {
      return next(errorHandler(409, "Email or phone number already exists."));
    }

    // Check and update Role collection
    let roles: { id: Types.ObjectId; assignedBy: Types.ObjectId }[] = [];
    if (roleIds && roleIds.length > 0) {
      const roleCount = await Role.countDocuments({
        _id: { $in: roleIds },
      }).session(session);
      if (roleCount !== roleIds.length) {
        return next(errorHandler(400, "One or more roles do not exist."));
      }

      await Role.updateMany(
        { _id: { $in: roleIds } },
        { $inc: { userAssigned: 1 } },
        { session }
      );

      const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
      roles = roleIds.map((id) => ({
        id: new Types.ObjectId(id),
        assignedBy: reqUserId,
      }));
    }

    const hashedPassword = await bcrypt.hash(password, HASH_SALT);
    const user = new User({
      email,
      isEmailVerified,
      phoneNumber,
      isPhoneNumberVerified,
      password: hashedPassword,
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
    if (session.inTransaction()) await session.abortTransaction();
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
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  if (isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const userId = req.params.id;

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      return next(errorHandler(404, "User not found."));
    }
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      return next(errorHandler(404, "User not found."));
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

export async function search(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing search users request...");
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  if (isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 9;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const query: any = {};

  const searchTerm = req.query.searchTerm as string;
  if (searchTerm) {
    query.$or = [
      { fullName: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } },
      { phoneNumber: { $regex: `^${searchTerm}`, $option: "i" } },
    ];
  }

  if (req.query.isEmailVerified) {
    query.isEmailVerified = req.query.isEmailVerified === "true";
  }
  if (req.query.isPhoneNumberVerified) {
    query.isPhoneNumberVerified = req.query.isPhoneNumberVerified === "true";
  }
  if (req.query.isLocked) {
    query.isLocked = req.query.isLocked === "true";
  }

  const sort = ((req.query.sortBy as string) || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await User.aggregate([
      { $match: { isDeleted: false, ...query } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortStage },
            { $skip: offset },
            { $limit: limit },
            {
              $project: {
                id: "$_id", // Rename _id to id
                _id: 0, // Exclude _id from the output
                fullName: 1,
                avatarUrl: 1,
                email: 1,
                isEmailVerified: 1,
                phoneNumber: 1,
                isPhoneNumberVerified: 1,
                stripeCustomerId: 1,
                userBalanceCents: 1,
                lastLogin: 1,
                createdAt: 1,
                updatedAt: 1,
                isLocked: 1,
              },
            },
          ],
        },
      },
    ]);

    const users = aggregationResult[0].data;
    const totalUsers = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: {
        total: totalUsers,
        users: users,
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
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  if (isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const userId = req.params.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      return next(errorHandler(404, "User not found."));
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      return next(errorHandler(404, "User not found."));
    }

    // Business logic
    const updateData = req.body as UserUpdate;

    const updatedAvatarUrl =
      updateData.avatarUrl !== undefined
        ? updateData.avatarUrl === null
          ? undefined
          : updateData.avatarUrl
        : (user.avatarUrl as string | undefined);
    const updatedPassword =
      updateData.password !== undefined
        ? await bcrypt.hash(updateData.password, HASH_SALT)
        : user.password;
    const updatedIsLocked =
      updateData.isLocked !== undefined ? updateData.isLocked : user.isLocked;

    if (user.avatarUrl !== updatedAvatarUrl && user.avatarUrl) {
      await deleteFileFromFirebaseStorage(user.avatarUrl, "user-avatar");
    }

    const updatedRoleIds = updateData.roleIds;
    if (updatedRoleIds) {
      const currentRoleIds = user.roles.map(
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
          return next(errorHandler(400, "One or more roles do not exist."));
        }

        await Role.updateMany(
          { _id: { $in: rolesToAdd } },
          { $inc: { userAssigned: 1 } },
          { session }
        );

        const reqUserId = new Types.ObjectId(
          (req["auth"] as RequestAuth).userId
        );
        user.roles.push(
          ...rolesToAdd.map((id) => ({
            id: new Types.ObjectId(id),
            assignedBy: reqUserId,
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
          user.roles.pull({ id: new Types.ObjectId(removeId) });
        });
      }
    }

    // Save changes
    const oldIsLocked = user.isLocked; // For notification

    user.fullName = updateData.fullName || user.fullName;
    user.avatarUrl = updatedAvatarUrl;
    user.password = updatedPassword;
    user.userBalanceCents = updateData.userBalanceCents || user.userBalanceCents;
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
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  if (isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const userId = req.params.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      return next(errorHandler(404, "User not found."));
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      return next(errorHandler(404, "User not found."));
    }

    // Business logic
    const { email, isEmailVerified } = req.body as UserUpdateEmail;
    const updatedEmail =
      email !== undefined
        ? email === null
          ? undefined
          : email
        : (user.email as string | undefined);
    const updatedIsEmailVerified =
      isEmailVerified !== undefined ? isEmailVerified : user.isEmailVerified;

    const existingUser = await User.findOne({
      _id: { $ne: user._id }, // Exclude current user
      email: updatedEmail,
      isDeleted: false,
    }).lean().session(session);
    if (existingUser) {
      return next(errorHandler(409, "Email already exists."));
    }

    if (!updatedEmail && updatedIsEmailVerified) {
      return next(
        errorHandler(400, "Email cannot be empty when isEmailVerified is true.")
      );
    }

    // Save changes
    const oldEmail = user.email; // For notification
    const oldIsEmailVerified = user.isEmailVerified; // For notification
    user.email = updatedEmail;
    user.isEmailVerified = updatedIsEmailVerified;
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
        oldEmail ? oldEmail : "No email",
        updatedEmail ? updatedEmail : "No email",
        user.fullName,
        updatedIsEmailVerified
      );
      /**
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
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  if (isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }
  const userId = req.params.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      return next(errorHandler(404, "User not found."));
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      return next(errorHandler(404, "User not found."));
    }

    // Business logic
    const { phoneNumber, isPhoneNumberVerified } =
      req.body as UserUpdatePhoneNumber;
    const updatedPhoneNumber =
      phoneNumber !== undefined
        ? phoneNumber === null
          ? undefined
          : phoneNumber
        : (user.phoneNumber as string | undefined);
    const updatedIsPhoneNumberVerified =
      isPhoneNumberVerified !== undefined
        ? isPhoneNumberVerified
        : user.isPhoneNumberVerified;

    const existingUser = await User.findOne({
      _id: { $ne: user._id }, // Exclude current user
      phoneNumber: updatedPhoneNumber,
      isDeleted: false,
    }).lean().session(session);
    if (existingUser) {
      return next(errorHandler(409, "Phone number already exists."));
    }

    if (!updatedPhoneNumber && updatedIsPhoneNumberVerified) {
      return next(
        errorHandler(
          400,
          "Phone number cannot be empty when isPhoneNumberVerified is true."
        )
      );
    }

    // Save changes
    const oldPhoneNumber = user.phoneNumber; // For notification
    const oldIsPhoneNumberVerified = user.isPhoneNumberVerified; // For notification
    user.phoneNumber = updatedPhoneNumber;
    user.isPhoneNumberVerified = updatedIsPhoneNumberVerified;
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
          oldPhoneNumber ? oldPhoneNumber : "No phone number",
          updatedPhoneNumber ? updatedPhoneNumber : "No phone number",
          user.fullName,
          updatedIsPhoneNumberVerified
        );
      } else {
        const recipients = oldPhoneNumber ? [oldPhoneNumber] : [];
        if (updatedPhoneNumber) recipients.push(updatedPhoneNumber as string);
        await sendPhoneNumberChangeSms(
          recipients,
          oldPhoneNumber ? oldPhoneNumber : "No phone number",
          updatedPhoneNumber ? updatedPhoneNumber : "No phone number",
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
  const { userId: reqUserId, isBuyerOnly } = req["auth"] as RequestAuth;
  if (isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const userId = req.params.id;
  if (reqUserId === userId) {
    return next(
      errorHandler(400, "You cannot delete your own account as an admin.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      return next(errorHandler(404, "User not found."));
    }
    const user = await User.findById(userId).session(session);
    if (!user || user.isDeleted) {
      return next(errorHandler(404, "User not found."));
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

// --- BUYER FUNCTIONS ---
export async function updateSelfContactInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user contact info request...");
  const { userId, isBuyerOnly } = req["auth"] as RequestAuth;

  // Check only buyer perform this action
  if (!isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const { value, type } = req.body as UserUpdateContactInfo;
  const user = req["user"];
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
    }).lean().session(session);
    if (existingUser) {
      return next(
        errorHandler(
          409,
          `${type} already exists. If you sure this is your ${type},
          we think you was registered an account with this ${type} before.
          If you want to update your ${type} for the current account,
          we recommend you to login with this ${type} first and change or delete the existing account.`
        )
      );
    }

    user[type] = value;
    user[type === "email" ? "isEmailVerified" : "isPhoneNumberVerified"] =
      false;
    if (!user.isEmailVerified && !user.isPhoneNumberVerified) {
      return next(
        errorHandler(400, "Please verify at least one contact info.")
      );
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
      await sendVerificationEmail(value, verificationCode);
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
  const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
  if (!isBuyerOnly) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const reqUser = req["user"];
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = (await User.findById(userId).session(session))!;

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
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  const user = req["user"];

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
  const { isBuyerOnly } = req["auth"] as RequestAuth;
  const user = req["user"];
  const { fullName, avatarUrl, password } = req.body as UserUpdate;

  try {
    // Business logic
    const updatedFullName = fullName !== undefined ? fullName : user.fullName;
    const updatedAvatarUrl =
      avatarUrl !== undefined
        ? avatarUrl === null
          ? undefined
          : avatarUrl
        : (user.avatarUrl as string | undefined);
    const updatedPassword =
      password !== undefined
        ? await bcrypt.hash(password, HASH_SALT)
        : user.password;

    if (user.avatarUrl !== updatedAvatarUrl && user.avatarUrl) {
      await deleteFileFromFirebaseStorage(user.avatarUrl, "user-avatar");
    }

    // Save changes
    user.fullName = updatedFullName;
    user.avatarUrl = updatedAvatarUrl;
    user.password = updatedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: isBuyerOnly
        ? formatUserResponse(user)
        : formatAdminUserResponse(user),
    } as SuccessResponse<UserResponse | AdminUserResponse>);
    console.log("✅", "User updated successfully.");
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
    throw error;
  }
}

async function executeDeletion(
  userToDelete: any,
  deletedBy: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  try {
    // Recalculate userAssigned from Roles
    const roleIds = userToDelete.roles.map((role: any) => role.id as string);
    await Role.updateMany(
      { _id: { $in: roleIds } },
      { $inc: { userAssigned: -1 } },
      { session }
    );

    // Check for constraints to decide deletion strategy
    if (await hasConstraints(userToDelete._id)) {
      // Soft delete
      userToDelete.isDeleted = true;
      userToDelete.deletedAt = new Date();
      userToDelete.deletedBy = deletedBy;
      await userToDelete.save({ session });
      return;
    }

    // Hard delete (and cleanup)
    if (userToDelete.avatarUrl) {
      await deleteFileFromFirebaseStorage(
        userToDelete.avatarUrl,
        "user-avatar"
      );
    }
    // The pre-delete hook on the User model is a better place for this,
    // but keeping it here is also valid within the transaction.
    await Otp.deleteMany({ userId: userToDelete._id }, { session });
    await PasswordResetToken.deleteMany(
      { userId: userToDelete._id },
      { session }
    );
    await Cart.deleteMany({ userId: userToDelete._id }, { session });
    await UserPaymentMethod.deleteMany(
      { userId: userToDelete._id },
      { session }
    );
    await UserAddress.deleteMany({ userId: userToDelete._id }, { session });

    await deleteFileFromFirebaseStorage(
      userToDelete.avatarUrl,
      "user-avatar"
    );
    await userToDelete.deleteOne({ session });
  } catch (error) {
    throw error;
  }
}
