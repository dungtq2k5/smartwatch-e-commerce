import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import ProviderAddress from "../../models/inventory/providerAddress.model";
import {
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { formatProviderAddressResponse } from "../../utils/utils";
import {
  ProviderAddressCreate,
  ProviderAddressResponse,
  ProviderAddressUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import Provider from "../../models/inventory/provider.model";
import {
  formatAddress,
  getCountryFromPhoneNumber,
  isValidPostalCode,
} from "../../../common/utils.common";
import User from "../../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Processing create provider address request...");
  const reqUser = req["user"];
  if (!reqUser) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }

  const { providerId } = req.params;
  const {
    name,
    addressLine1,
    addressLine2,
    locality,
    adminAreaL1,
    adminAreaL2,
    postalCode,
    phoneNumber,
    location,
    notes,
    isDefault,
  } = req.body as ProviderAddressCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check providerId exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(providerId)
      .select("_id isDeleted")
      .lean()
      .session(session);
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider not found.");
    }

    /* Business logic:
      - If isDefault is true, set all other addresses of this provider to isDefault false.
      - If first address of this provider but isDefault is false -> throw error.
    */

    if (isDefault) {
      await ProviderAddress.updateMany(
        { providerId, isDefault: true },
        { isDefault: false },
        { session },
      );
    } else {
      const existingAddressesCount = await ProviderAddress.countDocuments({
        providerId,
      }).session(session);
      if (existingAddressesCount === 0) {
        throw new HttpError(400, "The first address must be set as default.");
      }
    }

    const newAddress = new ProviderAddress({
      providerId,
      name,
      addressLine1,
      addressLine2,
      locality,
      adminAreaL1,
      adminAreaL2,
      postalCode,
      phoneNumber,
      fullAddress: formatAddress(req.body),
      location: {
        coordinates: [location.latitude, location.longitude],
      },
      notes,
      isDefault: !!isDefault,
      createdBy: reqUser.id,
    });

    await newAddress.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Provider address created successfully.",
      data: formatProviderAddressResponse({
        ...newAddress.toObject(),
        createdBy: {
          _id: reqUser.id,
          fullName: reqUser.fullName,
        },
      }),
    } as SuccessResponse<ProviderAddressResponse>);
    console.log("✅ ", "Provider address created successfully.");
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
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Processing get provider address request...");

  const { providerId, addressId } = req.params;

  try {
    // Check exists
    if (
      !Types.ObjectId.isValid(providerId) ||
      !Types.ObjectId.isValid(addressId)
    ) {
      throw new HttpError(404, "Provider address not found.");
    }
    const provider = await Provider.findById(providerId)
      .select("_id isDeleted")
      .lean();
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider address not found.");
    }
    const address = await ProviderAddress.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(addressId),
          providerId: new Types.ObjectId(providerId),
        },
      },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [OPTIMIZE_CREATED_BY_PIPELINE],
        },
      },
      { $unwind: "$createdBy" },
    ]).then((results) => results[0]);

    if (!address) {
      throw new HttpError(404, "Provider address not found.");
    }

    res.status(200).json({
      success: true,
      message: "Provider address fetched successfully.",
      data: formatProviderAddressResponse(address),
    } as SuccessResponse<ProviderAddressResponse>);
    console.log("✅ ", "Provider address fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Processing update provider address request...");

  const { providerId, addressId } = req.params;
  const {
    name,
    addressLine1,
    addressLine2,
    locality,
    adminAreaL1,
    adminAreaL2,
    postalCode,
    phoneNumber,
    location,
    notes,
    isDefault,
  } = req.body as ProviderAddressUpdate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (
      !Types.ObjectId.isValid(providerId) ||
      !Types.ObjectId.isValid(addressId)
    ) {
      throw new HttpError(404, "Provider address not found.");
    }
    const provider = await Provider.findById(providerId)
      .select("_id isDeleted")
      .lean()
      .session(session);
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider address not found.");
    }
    const address = await ProviderAddress.findOne({
      _id: addressId,
      providerId,
    }).session(session);
    if (!address) {
      throw new HttpError(404, "Provider address not found.");
    }

    const updatedName = name || address.name;
    const updatedAddressLine1 = addressLine1 || address.addressLine1;
    const updatedAddressLine2 =
      addressLine2 !== undefined ? addressLine2 : address.addressLine2;
    const updatedLocality = locality || address.locality;
    const updatedAdminAreaL1 = adminAreaL1 || address.adminAreaL1;
    const updatedAdminAreaL2 =
      adminAreaL2 !== undefined ? adminAreaL2 : address.adminAreaL2;
    const updatedPostalCode = postalCode || address.postalCode;
    const updatedPhoneNumber = phoneNumber || address.phoneNumber;
    const updatedNotes = notes !== undefined ? notes : address.notes;
    const updatedIsDefault = isDefault ?? address.isDefault;

    // Check postal code match with country code
    if (updatedPostalCode !== address.postalCode) {
      const countryCode = getCountryFromPhoneNumber(updatedPhoneNumber)?.code;
      if (!countryCode) {
        throw new HttpError(
          400,
          "phoneNumber is not valid, can't detect country code from it.",
        );
      }

      if (!isValidPostalCode(countryCode, updatedPostalCode)) {
        throw new HttpError(
          400,
          "postalCode is not valid for the given countryCode.",
        );
      }
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
        await ProviderAddress.updateMany(
          { providerId, isDefault: true },
          { isDefault: false },
          { session },
        );
      }
    }

    address.name = updatedName;
    address.addressLine1 = updatedAddressLine1;
    address.addressLine2 = updatedAddressLine2;
    address.locality = updatedLocality;
    address.adminAreaL1 = updatedAdminAreaL1;
    address.adminAreaL2 = updatedAdminAreaL2;
    address.postalCode = updatedPostalCode;
    address.phoneNumber = updatedPhoneNumber;
    if (location) {
      address.location.coordinates = [location.latitude, location.longitude];
    }
    address.notes = updatedNotes;
    address.isDefault = updatedIsDefault;

    await address.save({ session });

    const createdByUser = await User.findById(address.createdBy)
      .select("_id fullName")
      .lean()
      .session(session);
    if (!createdByUser) {
      throw new HttpError(500, "Created by user not found.");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Provider address updated successfully.",
      data: formatProviderAddressResponse({
        ...address.toObject(),
        createdBy: {
          _id: createdByUser._id,
          fullName: createdByUser.fullName,
        },
      }),
    } as SuccessResponse<ProviderAddressResponse>);
    console.log("✅ ", "Provider address updated successfully.");
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
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Processing delete provider address request...");

  const { providerId, addressId } = req.params;

  try {
    // Check exists
    if (
      !Types.ObjectId.isValid(providerId) ||
      !Types.ObjectId.isValid(addressId)
    ) {
      throw new HttpError(404, "Provider address not found.");
    }
    const provider = await Provider.findById(providerId)
      .select("_id isDeleted")
      .lean();
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider address not found.");
    }
    const address = await ProviderAddress.findById(addressId);
    if (!address) {
      throw new HttpError(404, "Provider address not found.");
    }

    // Can't delete default address
    if (address.isDefault) {
      throw new HttpError(409, "Can't delete default address.");
    }

    await address.deleteOne();

    res.status(200).json({
      success: true,
      message: "Provider address deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Provider address deleted successfully.");
  } catch (error) {
    next(error);
  }
}
