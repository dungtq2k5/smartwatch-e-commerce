import { Request, Response, NextFunction } from "express";
import Provider, { IProvider } from "../models/inventory/provider.model";
import { HttpError } from "../utils/errorHandler";
import { formatProviderResponse, isPresent } from "../utils/utils";
import {
  ProviderCreate,
  ProviderResponse,
  ProviderUpdate,
  SuccessResponse,
} from "../../common/types.common";
import { Types } from "mongoose";
import Grn from "../models/inventory/grn.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating provider...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
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
        `Provider with this ${existsField} already exists.`
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
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching provider by ID...");
  const id = req.params.id;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Provider not found.");
    }

    const provider = await Provider.findById(id).lean();
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

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating provider...");
  const id = req.params.id;
  const { fullName, email, phoneNumber } = req.body as ProviderUpdate;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(id);
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
          `Provider with this ${existsField} already exists.`
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
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting provider...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const id = req.params.id;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(id);
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
  providerId: Types.ObjectId | string
): Promise<boolean> {
  console.log("▶️ ", "Checking constraints for provider...");

  try {
    /*
      None-blocking constraints: none
      Blocking constraints:
        - Grn (providerId)
    */
    const constraintChecks = [Grn.exists({ providerId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for provider: ${providerId}. Soft delete required.`
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for provider: ${providerId}. Hard delete allowed.`
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
  deletedBy: Types.ObjectId
): Promise<void> {
  console.log("▶️ ", "Executing deletion of provider...");

  try {
    if (await hasConstraints(providerToDelete._id)) {
      await Provider.findByIdAndUpdate(providerToDelete._id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      });
      return;
    }

    await Provider.findByIdAndDelete(providerToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting provider:", error);
    throw error;
  }
}
