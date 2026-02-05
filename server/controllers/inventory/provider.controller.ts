import { Request, Response, NextFunction } from "express";
import Provider, { IProvider } from "../../models/inventory/provider.model";
import { HttpError } from "../../utils/errorHandler";
import {
  formatProviderDetailsResponse,
  formatProviderResponse,
  isPresent,
} from "../../utils/utils";
import {
  ProviderCreate,
  ProviderListResponse,
  ProviderResponse,
  ProviderUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { Types } from "mongoose";
import Grn from "../../models/inventory/grn.model";
import {
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import ProviderAddress from "../../models/inventory/providerAddress.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating provider...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }
  const { fullName, email, phoneNumber } = req.body as ProviderCreate;

  try {
    // Check exists
    const existingProvider = await Provider.findOne({
      isDeleted: false,
      $or: [{ fullName }, { email }, { phoneNumber }],
    }).lean();
    if (existingProvider) {
      const existsField =
        existingProvider.fullName === fullName
          ? "fullName"
          : existingProvider.email === email
            ? "email"
            : "phoneNumber";
      throw new HttpError(
        409,
        `Provider with this ${existsField} already exists.`,
      );
    }

    // Create
    const provider = new Provider({
      fullName,
      email,
      phoneNumber,
      createdBy: new Types.ObjectId(reqUserId),
    });

    await provider.save();

    res.status(201).json({
      success: true,
      message: "Provider created successfully.",
      data: formatProviderResponse(provider),
    } as SuccessResponse<ProviderResponse>);
    console.log("✅ ", "Provider created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching provider by ID...");
  const { providerId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }

    const provider = await Provider.findById(providerId).lean();
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider not found.");
    }

    res.status(200).json({
      success: true,
      message: "Provider fetched successfully.",
      data: formatProviderResponse(provider),
    } as SuccessResponse<ProviderResponse>);
    console.log("✅ ", "Provider fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all providers...");

  try {
    const providers = await Provider.find({ isDeleted: false }).lean();

    res.status(200).json({
      success: true,
      message: "Providers fetched successfully.",
      data: {
        total: providers.length,
        providers: providers.map(formatProviderResponse),
      },
    } as SuccessResponse<ProviderListResponse>);
    console.log("✅ ", "Providers fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching provider details by ID...");
  const { providerId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }

    const provider = await Provider.aggregate([
      { $match: { _id: new Types.ObjectId(providerId), isDeleted: false } },
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
      {
        $lookup: {
          from: "provideraddresses",
          localField: "_id",
          foreignField: "providerId",
          as: "addresses",
          pipeline: [
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
          ],
        },
      },
    ]).then((results) => results[0]);

    if (!provider) {
      throw new HttpError(404, "Provider not found.");
    }

    res.status(200).json({
      success: true,
      message: "Provider details fetched successfully.",
      data: formatProviderDetailsResponse(provider),
    } as SuccessResponse<any>);
    console.log("✅ ", "Provider details fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating provider...");
  const { providerId } = req.params;
  const { fullName, email, phoneNumber } = req.body as ProviderUpdate;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(providerId);
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider not found.");
    }

    // Check for duplicates
    const updatedFullname = fullName || provider.fullName;
    const updatedEmail = email || provider.email;
    const updatedPhoneNumber = phoneNumber || provider.phoneNumber;
    const orCondition: (
      | { fullName: string }
      | { email: string }
      | { phoneNumber: string }
    )[] = [];

    if (updatedFullname !== provider.fullName) {
      orCondition.push({ fullName: updatedFullname });
    }
    if (updatedEmail !== provider.email) {
      orCondition.push({ email: updatedEmail });
    }
    if (updatedPhoneNumber !== provider.phoneNumber) {
      orCondition.push({ phoneNumber: updatedPhoneNumber });
    }
    if (orCondition.length > 0) {
      const existingProvider = await Provider.findOne({
        isDeleted: false,
        $or: orCondition,
      }).lean();
      if (existingProvider) {
        const existsField =
          existingProvider.fullName === updatedFullname
            ? "fullName"
            : existingProvider.email === updatedEmail
              ? "email"
              : "phoneNumber";
        throw new HttpError(
          409,
          `Provider with this ${existsField} already exists.`,
        );
      }
    }

    // Update
    provider.fullName = updatedFullname;
    provider.email = updatedEmail;
    provider.phoneNumber = updatedPhoneNumber;
    await provider.save();

    res.status(200).json({
      success: true,
      message: "Provider updated successfully.",
      data: formatProviderResponse(provider),
    } as SuccessResponse<ProviderResponse>);
    console.log("✅ ", "Provider updated successfully.");
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Deleting provider...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }
  const { providerId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(providerId);
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider not found.");
    }

    // Execute deletion
    await executeDeletion(provider, new Types.ObjectId(reqUserId));

    res.status(200).json({
      success: true,
      message: "Provider deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Provider deleted successfully.");
  } catch (error) {
    next(error);
  }
}

// -- HELPER FUNCTIONS --
async function hasConstraints(
  providerId: Types.ObjectId | string,
): Promise<boolean> {
  console.log("▶️ ", "Checking constraints for provider...");

  try {
    /*
      None-blocking constraints: providerAddress
      Blocking constraints:
        - Grn (providerId)
    */
    const constraintChecks = [Grn.exists({ providerId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for provider: ${providerId}. Soft delete required.`,
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for provider: ${providerId}. Hard delete allowed.`,
      );
    }
    return hasConstraints;
  } catch (error) {
    console.error("❌ ", "Error checking provider constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  providerToDelete: IProvider,
  deletedBy: Types.ObjectId,
): Promise<void> {
  console.log("▶️ ", "Executing deletion of provider...");

  const session = await Provider.startSession();
  session.startTransaction();

  try {
    if (await hasConstraints(providerToDelete._id)) {
      await Provider.findByIdAndUpdate(
        providerToDelete._id,
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
        { session },
      );
      return;
    }

    // Delete all associated data (provider addresses)
    await ProviderAddress.deleteMany(
      { providerId: providerToDelete._id },
      { session },
    );
    await Provider.findByIdAndDelete(providerToDelete._id, { session });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ ", "Error deleting provider:", error);
    throw error;
  } finally {
    await session.commitTransaction();
    session.endSession();
  }
}
