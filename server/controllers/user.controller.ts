import { Request, Response, NextFunction } from "express";
import User from "../models/user/user.model";
import {
  formatAdminUserAddressResponse,
  formatAdminUserResponse,
  formatUserAddressResponse,
  formatUserCartResponse,
  formatUserResponse,
  genVerificationCode,
} from "../utils/utils";
import {
  AdminUserAddressResponse,
  AdminUserListResponse,
  AdminUserResponse,
  SuccessResponse,
  UserAddressCreate,
  UserAddressResponse,
  UserAddressResponseList,
  UserAddressUpdate,
  UserCartCreate,
  UserCartResponse,
  UserCartResponseList,
  UserCreate,
  UserResponse,
  UserUpdate,
  UserUpdateContactInfo,
  UserUpdateEmail,
  UserUpdatePhoneNumber,
} from "../../common/types.common";
import { errorHandler } from "../utils/errorHandler";
import bcrypt from "bcryptjs";
import { HASH_SALT, JWT_NAME } from "../configs/configs";
import {
  sendEmailChangeEmail,
  sendEmailVerifiedEmail,
  sendLockAccountChangeEmail,
  sendPhoneNumberChangeEmail,
  sendPhoneNumberVerifiedEmail,
  sendVerificationEmail,
} from "../utils/mailtrap";
import {
  sendLockAccountChangeSms,
  sendPhoneNumberChangeSms,
  sendPhoneNumberVerifiedSms,
  sendVerificationSms,
} from "../utils/twilio";
import mongoose, { Types } from "mongoose";
import { deleteFileFromFirebaseStorage } from "../utils/firebase";
import Otp from "../models/user/otp.model";
import PasswordResetToken from "../models/user/passwordResetToken.model";
import { VERIFICATION_CODE_TTL } from "../../common/configs.common";
import { RequestAuth } from "../utils/types";
import Role from "../models/role/role.model";
import Order from "../models/order/order.model";
import UserPaymentMethod from "../models/user/userPaymentMethod.model";
import UserAddress from "../models/user/userAddress.model";
import Cart from "../models/user/cart.model";
import Provider from "../models/inventory/provider.model";
import Grn from "../models/inventory/grn.model";
import InventoryMovement from "../models/inventory/inventoryMovement.model";
import Product from "../models/product/product.model";
import ProductBrand from "../models/product/productBrand.model";
import ProductCategory from "../models/product/productCategory.model";
import ProductOs from "../models/product/productOs.model";
import ProductVariation from "../models/product/productVariation.model";
import Variation from "../models/product/variation.model";

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
    const [user] = await User.create(
      [{ ...req.body, password: hashedPassword, roles }],
      { session }
    );

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

  if (req.query.searchTerm) {
    query.$or = [
      { fullName: { $regex: req.query.searchTerm as string, $options: "i" } },
      { email: { $regex: req.query.searchTerm as string, $options: "i" } },
      { phoneNumber: { $regex: req.query.searchTerm as string } },
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
    const {
      fullName,
      avatarUrl,
      password,
      userBalanceCents,
      isLocked,
      roleIds: updatedRoleIds,
    } = req.body as UserUpdate;
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
    const updatedUserBalanceCents =
      userBalanceCents !== undefined ? userBalanceCents : user.userBalanceCents;
    const updatedIsLocked = isLocked !== undefined ? isLocked : user.isLocked;

    if (user.avatarUrl !== updatedAvatarUrl && user.avatarUrl) {
      await deleteFileFromFirebaseStorage(user.avatarUrl, "user-avatar");
    }

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
    user.fullName = updatedFullName;
    user.avatarUrl = updatedAvatarUrl;
    user.password = updatedPassword;
    user.userBalanceCents = updatedUserBalanceCents;
    user.isLocked = updatedIsLocked;
    await user.save({ session });

    if (oldIsLocked !== updatedIsLocked) {
      if (user.email) {
        await sendLockAccountChangeEmail(
          user.email,
          updatedFullName,
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
    }).session(session);
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
    }).session(session);
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

export async function getAddresses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user addresses request...");
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

    const addresses = await UserAddress.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "User addresses retrieved successfully",
      data: {
        total: addresses.length,
        addresses: addresses.map((address) =>
          formatUserAddressResponse(address)
        ),
      },
    } as SuccessResponse<UserAddressResponseList>);
    console.log("✅", "User addresses retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function createAddress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user address request...");
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

    const {
      name,
      street,
      apartmentNumber,
      ward,
      district,
      cityProvince,
      country,
      phoneNumber,
      isDefault,
    } = req.body as UserAddressCreate;

    // Business logic
    if (isDefault) {
      await UserAddress.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    const [address] = await UserAddress.create(
      [
        {
          userId,
          name,
          street,
          apartmentNumber,
          ward,
          district,
          cityProvince,
          country,
          phoneNumber,
          isDefault,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User address created successfully",
      data: formatAdminUserAddressResponse(address),
    } as SuccessResponse<AdminUserAddressResponse>);
    console.log("✅", "User address created successfully.");
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
    }).session(session);
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

export async function getSelfAddresses(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user addresses request...");
  const { userId } = req["auth"] as RequestAuth;

  try {
    const addresses = await UserAddress.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "User addresses retrieved successfully",
      data: {
        total: addresses.length,
        addresses: addresses.map((address) =>
          formatUserAddressResponse(address)
        ),
      },
    } as SuccessResponse<UserAddressResponseList>);
    console.log("✅", "User addresses retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function updateAddress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user address request...");
  const addressId = req.params.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      return next(errorHandler(404, "Address not found."));
    }
    const address = await UserAddress.findById(addressId).session(session);
    if (!address) {
      return next(errorHandler(404, "Address not found."));
    }

    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (isBuyerOnly && !address.userId.equals(userId)) {
      return next(errorHandler(403, "You do not own this resource."));
    }

    // Business logic
    // Business logic
    const {
      name,
      street,
      apartmentNumber,
      ward,
      district,
      cityProvince,
      country,
      phoneNumber,
      isDefault,
    } = req.body as UserAddressUpdate;
    /**
      isDefault scenarios:
        - true -> true,
        - false -> false,
        - true -> false,
        - false -> true
     */
    if (isDefault !== undefined && isDefault && !address.isDefault) {
      await UserAddress.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }
    address.name = name !== undefined ? name : address.name;
    address.street = street !== undefined ? street : address.street;
    address.apartmentNumber =
      apartmentNumber !== undefined ? apartmentNumber : address.apartmentNumber;
    address.ward = ward !== undefined ? ward : address.ward;
    address.district = district !== undefined ? district : address.district;
    address.cityProvince =
      cityProvince !== undefined ? cityProvince : address.cityProvince;
    address.country = country !== undefined ? country : address.country;
    address.phoneNumber =
      phoneNumber !== undefined ? phoneNumber : address.phoneNumber;
    address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

    await address.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "User address updated successfully",
      data: formatUserAddressResponse(address),
    } as SuccessResponse<UserAddressResponse>);
    console.log("✅", "User address updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function removeAddress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing delete user address request...");
  const addressId = req.params.id;

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      return next(errorHandler(404, "Address not found."));
    }
    const address = await UserAddress.findById(addressId);
    if (!address) {
      return next(errorHandler(404, "Address not found."));
    }

    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (isBuyerOnly && !address.userId.equals(userId)) {
      return next(errorHandler(403, "You do not own this resource."));
    }

    // Business logic
    if (address.isDefault) {
      return next(errorHandler(400, "You cannot delete the default address."));
    }

    await address.deleteOne();

    res.status(200).json({
      success: true,
      message: "User address deleted successfully",
    } as SuccessResponse);
    console.log("✅", "User address deleted successfully.");
  } catch (error) {
    next(error);
  }
}

export async function createSelfAddress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user address request...");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      name,
      street,
      apartmentNumber,
      ward,
      district,
      cityProvince,
      country,
      phoneNumber,
      isDefault,
    } = req.body as UserAddressCreate;

    const { userId } = req["auth"] as RequestAuth;
    if (isDefault) {
      await UserAddress.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    const [address] = await UserAddress.create(
      [
        {
          userId,
          name,
          street,
          apartmentNumber,
          ward,
          district,
          cityProvince,
          country,
          phoneNumber,
          isDefault,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User address created successfully",
      data: formatUserAddressResponse(address),
    } as SuccessResponse<UserAddressResponse>);
    console.log("✅", "User address created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function getSelfCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user cart request...");
  const { userId } = req["auth"] as RequestAuth;

  try {
    const carts = await Cart.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "User cart retrieved successfully",
      data: {
        carts: carts.map((cart) => formatUserCartResponse(cart)),
        total: carts.length,
      },
    } as SuccessResponse<UserCartResponseList>);
    console.log("✅", "User cart retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function createSelfCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user cart request...");
  const { variationId, quantity } = req.body as UserCartCreate;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await Variation.findById(variationId).session(session);
    if (!variation || variation.isDeleted) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Business logic
    // Cart exists -> update quantity
    // Cart does not exist -> create new cart
    const { userId } = req["auth"] as RequestAuth;
    const existingCart = await Cart.findOne({
      userId,
      variationId,
    }).session(session);
    const totalQuantity = existingCart
      ? existingCart.quantity + (quantity || 1)
      : quantity || 1;
    if (totalQuantity > variation.stockQuantity) {
      return next(
        errorHandler(
          400,
          `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
        )
      );
    }

    let cart: any;
    if (existingCart) {
      existingCart.quantity = totalQuantity;
      await existingCart.save({ session });
      cart = formatUserCartResponse(existingCart);
    } else {
      const [cart] = await Cart.create(
        [
          {
            userId,
            variationId,
            quantity: quantity || 1,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User cart created successfully",
      data: formatUserCartResponse(cart),
    } as SuccessResponse<UserCartResponse>);
    console.log("✅", "User cart created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updateSelfCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user cart request...");
  const variationId = req.params.variationId;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await Variation.findById(variationId);
    if (!variation || variation.isDeleted) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Check cart exists
    const { userId } = req["auth"] as RequestAuth;
    const cart = await Cart.findOne({
      userId,
      variationId,
    });
    if (!cart) {
      return next(errorHandler(404, "Cart item not found."));
    }

    // Business logic
    const quantity = req.body.quantity as number;
    if (quantity > variation.stockQuantity) {
      return next(
        errorHandler(
          400,
          `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
        )
      );
    }
    if (quantity === 0) {
      await cart.deleteOne();
      res.status(200).json({
        success: true,
        message: "Cart item deleted successfully",
      } as SuccessResponse);
      console.log("✅", "Cart item deleted successfully.");
      return;
    }

    cart.quantity = quantity;
    await cart.save();
    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: formatUserCartResponse(cart),
    } as SuccessResponse<UserCartResponse>);
  } catch (error) {
    next(error);
  }
}

export async function removeSelfCart(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing delete user cart request...");
  const variationId = req.params.variationId;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await Variation.findById(variationId);
    if (!variation || variation.isDeleted) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Check cart exists
    const { userId } = req["auth"] as RequestAuth;
    const cart = await Cart.findOne({
      userId,
      variationId,
    });
    if (!cart) {
      return next(errorHandler(404, "Cart item not found."));
    }

    // Business logic
    await cart.deleteOne();

    res.status(200).json({
      success: true,
      message: "Cart item deleted successfully",
    } as SuccessResponse);
    console.log("✅", "Cart item deleted successfully.");
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
        - ProductVariation (createdBy, deletedBy)
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
      ProductVariation.exists({
        $or: [{ createdBy: userId }, { deletedBy: userId }],
      }),
      Variation.exists({
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
    } else {
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
      await userToDelete.deleteOne({ session });
    }
  } catch (error) {
    throw error;
  }
}
