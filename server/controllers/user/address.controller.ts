import { Request, Response, NextFunction } from "express";
import User from "../../models/user/user.model";
import {
  formatAdminUserAddressResponse,
  formatUserAddressResponse,
} from "../../utils/utils";
import {
  AdminUserAddressResponse,
  SuccessResponse,
  UserAddressCreate,
  UserAddressResponse,
  UserAddressResponseList,
  UserAddressUpdate,
} from "../../../common/types.common";
import { errorHandler } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import { RequestAuth } from "../../utils/types";
import UserAddress from "../../models/user/userAddress.model";

// --- ADMIN FUNCTIONS ---
export async function get(
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

export async function create(
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

    const address = new UserAddress({
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
    });

    await address.save({ session });

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

// --- BOTH ADMIN AND BUYER FUNCTIONS ---
export async function getSelf(
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

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user address request...");
  const { userId: reqUserId, isBuyerOnly } = req["auth"] as RequestAuth;
  const { userId: userIdFromParams, id: addressId } = req.params;

  const targetUserId = userIdFromParams || reqUserId;

  if (isBuyerOnly && targetUserId !== reqUserId) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      return next(errorHandler(404, "Address not found."));
    }
    const address = await UserAddress.findOne({
      _id: addressId,
      userId: targetUserId,
    }).session(session);
    if (!address) {
      return next(errorHandler(404, "Address not found."));
    }

    // Business logic
    const updateData = req.body as UserAddressUpdate;
    const isDefault = updateData.isDefault;
    /**
      isDefault scenarios:
        - true -> true,
        - false -> false,
        - true -> false,
        - false -> true
     */
    if (isDefault !== undefined && isDefault && !address.isDefault) {
      await UserAddress.updateMany(
        { userId: targetUserId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    address.name = updateData.name || address.name;
    address.street = updateData.street || address.street;
    address.apartmentNumber = updateData.apartmentNumber || address.apartmentNumber;
    address.ward = updateData.ward || address.ward;
    address.district = updateData.district || address.district;
    address.cityProvince = updateData.cityProvince || address.cityProvince;
    address.country = updateData.country || address.country;
    address.phoneNumber = updateData.phoneNumber || address.phoneNumber;
    address.isDefault = isDefault ?? address.isDefault;

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

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing delete user address request...");
  const { userId: reqUserId, isBuyerOnly } = req["auth"] as RequestAuth;
  const { userId: userIdFromParams, id: addressId } = req.params;

  const targetUserId = userIdFromParams || reqUserId;

  if (isBuyerOnly && targetUserId !== reqUserId) {
    return next(
      errorHandler(403, "You do not have permission to perform this action.")
    );
  }

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      return next(errorHandler(404, "Address not found."));
    }
    const address = await UserAddress.findOne({
      _id: addressId,
      userId: targetUserId,
    });
    if (!address) {
      return next(errorHandler(404, "Address not found."));
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

export async function createSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user address request...");
  const data = req.body as UserAddressCreate;
  const { userId } = req["auth"] as RequestAuth;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (data.isDefault) {
      await UserAddress.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    const address = new UserAddress({
      userId,
      ...data,
    });

    await address.save({ session });

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
