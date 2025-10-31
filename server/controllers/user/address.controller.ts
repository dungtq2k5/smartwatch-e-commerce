import { Request, Response, NextFunction } from "express";
import User from "../../models/user/user.model";
import {
  formatAdminUserAddressResponse,
  formatUserAddressResponse,
  isPresent,
} from "../../utils/utils";
import {
  AdminUserAddressResponse,
  SuccessResponse,
  UserAddressCreate,
  UserSelfAddressResponse,
  UserAddressListResponse,
  UserAddressUpdate,
} from "../../../common/types.common";
import { HttpError } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import UserAddress from "../../models/user/userAddress.model";
import { formatAddress, isValidAddress } from "../../../common/utils.common";

// --- ADMIN FUNCTIONS ---
export async function getAllByUserId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user addresses request...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (!isBuyerOnly) {
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

    const addresses = await UserAddress.find({ userId })
      .sort({
        createdAt: -1,
      })
      .lean();

    res.status(200).json({
      success: true,
      message: "User addresses retrieved successfully",
      data: {
        total: addresses.length,
        addresses: addresses.map((address) =>
          formatUserAddressResponse(address)
        ),
      },
    } as SuccessResponse<UserAddressListResponse>);
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

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (!isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { userId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check user exists
    if (!Types.ObjectId.isValid(userId)) {
      throw new HttpError(404, "User not found.");
    }
    const user = await User.findById(userId).lean().session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    const {
      name,
      street,
      apartmentNumber,
      wardCode,
      districtCode,
      cityProvinceCode,
      location,
      phoneNumber,
      isDefault,
    } = req.body as UserAddressCreate;

    // Business logic
    if (
      !isValidAddress({
        wardCode,
        districtCode,
        cityProvinceCode,
      })
    ) {
      throw new HttpError(400, "Invalid address data.");
    }

    if (isDefault) {
      await UserAddress.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    } else {
      // Case when first address create but isDefault = false
      const addressCount = await UserAddress.countDocuments({
        userId,
      }).session(session);
      if (addressCount === 0) {
        throw new HttpError(400, "You must set the first address as default.");
      }
    }

    const address = new UserAddress({
      userId,
      name,
      street,
      apartmentNumber,
      wardCode,
      districtCode,
      cityProvinceCode,
      location: {
        coordinates: [location.longitude, location.latitude],
      },
      phoneNumber,
      fullAddress: formatAddress(req.body),
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
export async function getSelfAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user addresses request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    throw new HttpError(
      500,
      "User ID not found, this should be handled in middlewares."
    );
  }

  try {
    const addresses = await UserAddress.find({ userId })
      .sort({
        createdAt: -1,
      })
      .lean();

    res.status(200).json({
      success: true,
      message: "User addresses retrieved successfully",
      data: {
        total: addresses.length,
        addresses: addresses.map((address) =>
          formatUserAddressResponse(address)
        ),
      },
    } as SuccessResponse<UserAddressListResponse>);
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
  console.log("▶️ ", "Processing update self user address request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  const { userId: userIdFromParams, addressId } = req.params;

  const targetUserId = userIdFromParams || reqUserId;

  if (isBuyerOnly && targetUserId !== reqUserId) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      throw new HttpError(404, "Address not found.");
    }
    const address = await UserAddress.findOne({
      _id: addressId,
      userId: targetUserId,
    }).session(session);
    if (!address) {
      throw new HttpError(404, "Address not found.");
    }

    // Business logic
    const {
      name,
      street,
      apartmentNumber,
      wardCode,
      districtCode,
      cityProvinceCode,
      location,
      phoneNumber,
      isDefault,
    } = req.body as UserAddressUpdate;

    const updatedName = name || address.name;
    const updatedStreet = street || address.street;
    const updatedApartmentNumber = apartmentNumber || address.apartmentNumber;
    const updatedWardCode = wardCode || address.wardCode;
    const updatedDistrictCode = districtCode || address.districtCode;
    const updatedCityProvinceCode =
      cityProvinceCode || address.cityProvinceCode;
    const updatedPhoneNumber = phoneNumber || address.phoneNumber;
    const updatedIsDefault = isDefault ?? address.isDefault;

    if (
      updatedWardCode !== address.wardCode ||
      updatedDistrictCode !== address.districtCode ||
      updatedCityProvinceCode !== address.cityProvinceCode
    ) {
      if (
        !isValidAddress({
          wardCode: updatedWardCode,
          districtCode: updatedDistrictCode,
          cityProvinceCode: updatedCityProvinceCode,
        })
      ) {
        throw new HttpError(400, "Invalid address data.");
      }

      address.fullAddress = formatAddress({
        street: updatedStreet,
        apartmentNumber: updatedApartmentNumber,
        wardCode: updatedWardCode,
        districtCode: updatedDistrictCode,
        cityProvinceCode: updatedCityProvinceCode,
      });
    }

    /**
      isDefault scenarios:
        - true -> true.
        - false -> false.
        - true -> false: forbidden.
        - false -> true.
     */
    if (updatedIsDefault !== address.isDefault) {
      if (updatedIsDefault === false && address.isDefault === true) {
        throw new HttpError(409, "Can't update default address to false.");
      } else {
        await UserAddress.updateMany(
          { userId: targetUserId, isDefault: true },
          { $set: { isDefault: false } },
          { session }
        );
      }
    }

    address.name = updatedName;
    address.street = updatedStreet;
    address.apartmentNumber = updatedApartmentNumber;
    address.wardCode = updatedWardCode;
    address.districtCode = updatedDistrictCode;
    address.cityProvinceCode = updatedCityProvinceCode;
    if (location)
      address.location = {
        locationType: "point",
        coordinates: [location.longitude, location.latitude],
      };
    address.phoneNumber = updatedPhoneNumber;
    address.isDefault = updatedIsDefault;

    await address.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "User address updated successfully",
      data: formatUserAddressResponse(address),
    } as SuccessResponse<UserSelfAddressResponse>);
    console.log("✅", "User self address updated successfully.");
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
  console.log("▶️ ", "Processing delete self user address request...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  const { userId: userIdFromParams, addressId } = req.params;

  const targetUserId = userIdFromParams || reqUserId;

  try {
    if (isBuyerOnly && targetUserId !== reqUserId) {
      throw new HttpError(
        403,
        "You do not have permission to perform this action."
      );
    }

    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      throw new HttpError(404, "Address not found.");
    }
    const address = await UserAddress.findOne({
      _id: addressId,
      userId: targetUserId,
    });
    if (!address) {
      throw new HttpError(404, "Address not found.");
    }

    // Business logic
    if (address.isDefault) {
      throw new HttpError(400, "You cannot delete the default address.");
    }

    await address.deleteOne();

    res.status(200).json({
      success: true,
      message: "User address deleted successfully",
    } as SuccessResponse);
    console.log("✅", "User self address deleted successfully.");
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

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const {
    name,
    street,
    apartmentNumber,
    wardCode,
    districtCode,
    cityProvinceCode,
    location,
    phoneNumber,
    isDefault,
  } = req.body as UserAddressCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (
      !isValidAddress({
        wardCode,
        districtCode,
        cityProvinceCode,
      })
    ) {
      throw new HttpError(400, "Invalid address data.");
    }

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
      wardCode,
      districtCode,
      cityProvinceCode,
      location: {
        coordinates: [location.longitude, location.latitude],
      },
      phoneNumber,
      fullAddress: formatAddress(req.body),
      isDefault,
    });

    await address.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User address created successfully",
      data: formatUserAddressResponse(address),
    } as SuccessResponse<UserSelfAddressResponse>);
    console.log("✅", "User address created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function getSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user address request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { addressId } = req.params;

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(addressId)) {
      throw new HttpError(404, "Address not found.");
    }
    const address = await UserAddress.findOne({
      _id: addressId,
      userId,
    }).lean();
    if (!address) {
      throw new HttpError(404, "Address not found.");
    }

    res.status(200).json({
      success: true,
      message: "User address retrieved successfully",
      data: formatUserAddressResponse(address),
    } as SuccessResponse<UserSelfAddressResponse>);
    console.log("✅", "User address retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getSelfDefault(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user default address request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }

  try {
    const address = await UserAddress.findOne({
      userId,
      isDefault: true,
    }).lean();

    res.status(200).json({
      success: true,
      message: "User default address retrieved successfully",
      data: address ? formatUserAddressResponse(address) : undefined,
    } as SuccessResponse<UserSelfAddressResponse | undefined>);
    console.log("✅", "User default address retrieved successfully.");
  } catch (error) {
    next(error);
  }
}
