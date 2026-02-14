import { Request, Response, NextFunction } from "express";
import Provider, { IProvider } from "../../models/inventory/provider.model";
import { HttpError } from "../../utils/errorHandler";
import {
  formatProviderDetailsResponse,
  formatProviderResponse,
  formatProviderResponseLite,
  isPresent,
} from "../../utils/utils";
import {
  ProviderBulkDelete,
  ProviderCreate,
  ProviderListResponse,
  ProviderListResponseLite,
  ProviderResponse,
  ProviderSearchQuery,
  ProviderUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import mongoose, { Types } from "mongoose";
import Grn from "../../models/inventory/grn.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import ProviderAddress from "../../models/inventory/providerAddress.model";
import User from "../../models/user/user.model";
import { MAX_PROVIDERS_TO_DELETE_BULK } from "../../../common/configs.common";
import { formatError } from "../../../common/utils.common";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating provider...");

  const user = req["user"];
  if (!isPresent(user)) {
    return next(
      new HttpError(
        500,
        "Request user not found, this should be handled by middlewares.",
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
      createdBy: user._id,
    });

    await provider.save();

    res.status(201).json({
      success: true,
      message: "Provider created successfully.",
      data: formatProviderResponse({
        ...provider.toObject(),
        createdBy: { _id: user._id, fullName: user.fullName },
      }),
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
    ]).then((results) => results[0]);
    if (!provider) {
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
    const providers = await Provider.find({ isDeleted: false })
      .select("_id fullName")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Providers fetched successfully.",
      data: {
        total: providers.length,
        providers: providers.map(formatProviderResponseLite),
      },
    } as SuccessResponse<ProviderListResponseLite>);
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

export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching providers...");
  const reqQuery = req["sanitizedQuery"] as ProviderSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = { isDeleted: false };

  const searchTerm = reqQuery.searchTerm;
  if (searchTerm) {
    query.$or = [
      {
        _id: Types.ObjectId.isValid(searchTerm)
          ? new Types.ObjectId(searchTerm)
          : undefined,
      },
      { fullName: { $regex: searchTerm, $options: "i" } },
      { email: { $regex: searchTerm, $options: "i" } },
      { phoneNumber: { $regex: `^${searchTerm}`, $options: "i" } },
    ];
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await Provider.aggregate([
      { $match: query },
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
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]).then((results) => results[0]);

    const providers: ProviderResponse[] = aggregationResult.data.map(
      formatProviderResponse,
    );
    const total = aggregationResult.metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Providers searched successfully.",
      data: {
        total,
        providers: {
          total: providers.length,
          providers,
        },
        offset,
        limit,
      },
    } as SuccessResponse<ProviderListResponse>);
    console.log("✅ ", "Providers searched successfully.");
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(providerId).session(session);
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
      })
        .session(session)
        .lean();
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
    await provider.save({ session });

    const createdByUser = await User.findById(provider.createdBy)
      .select("_id fullName")
      .lean()
      .session(session);
    if (!createdByUser) {
      throw new HttpError(500, "Creator user not found.");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Provider updated successfully.",
      data: formatProviderResponse({
        ...provider.toObject(),
        createdBy: { _id: createdByUser._id, fullName: createdByUser.fullName },
      }),
    } as SuccessResponse<ProviderResponse>);
    console.log("✅ ", "Provider updated successfully.");
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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }
    const provider = await Provider.findById(providerId).session(session);
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider not found.");
    }

    // Execute deletion
    await executeDeletion(provider, new Types.ObjectId(reqUserId), session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Provider deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Provider deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk deleting providers...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }

  const { providerIds: providerIdsToDelete } = req.body as ProviderBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (providerIdsToDelete.length > MAX_PROVIDERS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_PROVIDERS_TO_DELETE_BULK} providers at once.`,
      );
    }

    // Delete providers, if provider not found, skip
    for (const providerId of providerIdsToDelete) {
      const provider = Types.ObjectId.isValid(providerId)
        ? await Provider.findById(providerId).session(session)
        : null;
      if (provider && !provider.isDeleted) {
        await executeDeletion(provider, new Types.ObjectId(reqUserId), session);
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Providers deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Providers deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
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
  session: mongoose.ClientSession,
): Promise<void> {
  console.log("▶️ ", "Executing deletion of provider...");

  try {
    if (providerToDelete.isDeleted) return;

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
    throw new Error(formatError(error));
  }
}
