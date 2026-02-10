import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../utils/errorHandler";
import ProductOs, { IProductOs } from "../../models/product/productOs.model";
import {
  AdminProductOsListResponse,
  AdminProductOsResponse,
  ProductOsBulkDelete,
  ProductOsCreate,
  ProductOsListResponse,
  ProductOsResponse,
  ProductOsSearchQuery,
  ProductOsUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatAdminProductOsResponse,
  formatProductOsResponse,
  isPresent,
} from "../../utils/utils";
import mongoose, { Types } from "mongoose";
import ProductModel from "../../models/product/productModel.model";
import { deleteFileFromFirebaseStorage } from "../../utils/firebase";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_PRODUCT_OS_TO_DELETE_BULK } from "../../../common/configs.common";
import User from "../../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating product os...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { name, logoUrl, description } = req.body as ProductOsCreate;

  try {
    // Check os exists
    const existingOs = await ProductOs.findOne({
      isDeleted: false,
      name,
    }).lean();
    if (existingOs) {
      throw new HttpError(409, "Product os already exists.");
    }

    // Create os
    const os = new ProductOs({
      name,
      logoUrl,
      description,
      createdBy: userId,
    });

    await os.save();

    res.status(201).json({
      success: true,
      message: "Product os created successfully.",
      data: formatProductOsResponse(os),
    } as SuccessResponse<ProductOsResponse>);
    console.log("✅ ", "Product os created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching product os...");
  const { osId } = req.params;

  try {
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.findById(osId).lean();
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product os not found.");
    }
    res.status(200).json({
      success: true,
      message: "Product os fetched successfully.",
      data: formatProductOsResponse(os),
    } as SuccessResponse<ProductOsResponse>);
    console.log("✅ ", "Product os fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all product os...");
  try {
    const oses = await ProductOs.find({ isDeleted: false }).lean();

    res.status(200).json({
      success: true,
      message: "Product oses fetched successfully.",
      data: {
        oses: {
          total: oses.length,
          oses: oses.map(formatProductOsResponse),
        },
        offset: 0,
        limit: oses.length,
        total: oses.length,
      },
    } as SuccessResponse<ProductOsListResponse>);
    console.log("✅ ", "Product oses fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin fetching product os...");
  const { osId } = req.params;

  try {
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.aggregate([
      { $match: { _id: new Types.ObjectId(osId), isDeleted: false } },
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
    if (!os) {
      throw new HttpError(404, "Product os not found.");
    }

    res.status(200).json({
      success: true,
      message: "Product os fetched successfully.",
      data: formatAdminProductOsResponse(os),
    } as SuccessResponse<AdminProductOsResponse>);
    console.log("✅ ", "Product os fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin searching product oses...");

  const reqQuery = req["sanitizedQuery"] as ProductOsSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  if (reqQuery.searchTerm) {
    query.$or = [
      {
        _id: Types.ObjectId.isValid(reqQuery.searchTerm)
          ? new Types.ObjectId(reqQuery.searchTerm)
          : undefined,
      },
      { name: { $regex: reqQuery.searchTerm, $options: "i" } },
      {
        description: { $regex: reqQuery.searchTerm, $options: "i" },
      },
    ];
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await ProductOs.aggregate([
      { $match: { isDeleted: false, ...query } },
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
    ]);

    const oses: AdminProductOsResponse[] = aggregationResult[0].data.map(
      formatAdminProductOsResponse,
    );
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Product oses fetched successfully.",
      data: {
        total,
        oses: {
          total: oses.length,
          oses,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminProductOsListResponse>);
    console.log("✅ ", "Product oses fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating product os...");
  const { osId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check os exists
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.findById(osId).session(session);
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product os not found.");
    }

    // Check if name is updated and exists
    const updateData = req.body as ProductOsUpdate;

    const updatedName = updateData.name || os.name;
    if (updatedName !== os.name) {
      const existingOs = await ProductOs.findOne({
        isDeleted: false,
        name: updatedName,
      }).lean();
      if (existingOs) {
        throw new HttpError(409, "Product os already exists.");
      }
    }

    const updatedLogoUrl =
      updateData.logoUrl === null ? null : updateData.logoUrl || os.logoUrl;
    if (updatedLogoUrl !== os.logoUrl && os.logoUrl) {
      await deleteFileFromFirebaseStorage(os.logoUrl, "product-logo");
    }

    os.name = updatedName;
    os.logoUrl = updatedLogoUrl;
    os.description =
      updateData.description === null
        ? null
        : updateData.description || os.description;

    await os.save({ session });

    const createdByUser = await User.findById(os.createdBy)
      .select("_id fullName")
      .lean()
      .session(session);
    if (!createdByUser) {
      throw new HttpError(500, "Creator user not found.");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product os updated successfully.",
      data: formatAdminProductOsResponse({
        ...os.toObject(),
        createdBy: {
          _id: os.createdBy,
          fullName: createdByUser.fullName,
        },
      }),
    } as SuccessResponse<AdminProductOsResponse>);
    console.log("✅ ", "Product os updated successfully.");
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
  console.log("▶️ ", "Deleting product os...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { osId } = req.params;

  try {
    // Check os exists
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.findById(osId);
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product os not found.");
    }

    await executeDeletion(os, new Types.ObjectId(userId));

    res.status(200).json({
      success: true,
      message: "Product os deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product os deleted successfully.");
  } catch (error) {
    next(error);
  }
}

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk deleting product oses...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { osIds: osIdsToDelete } = req.body as ProductOsBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (osIdsToDelete.length > MAX_PRODUCT_OS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_PRODUCT_OS_TO_DELETE_BULK} product oses at once.`,
      );
    }

    // Delete oses, if os not found -> skip and continue
    for (const osId of osIdsToDelete) {
      const os = Types.ObjectId.isValid(osId)
        ? await ProductOs.findById(osId).session(session)
        : null;
      if (os && !os.isDeleted) {
        await executeDeletion(os, new Types.ObjectId(reqUserId));
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product oses deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product oses deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(osId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking os constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - ProductModel (osId)
    */
    const constraintChecks = [ProductModel.exists({ "config.osId": osId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for os: ${osId}. Soft delete required.`,
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for os: ${osId}. Hard delete allowed.`,
      );
    }
    return hasConstraints;
  } catch (error) {
    console.error("❌ ", "Error checking os constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  osToDelete: IProductOs,
  deletedBy: Types.ObjectId,
): Promise<void> {
  try {
    if (await hasConstraints(osToDelete._id)) {
      // Soft delete
      await ProductOs.findByIdAndUpdate(osToDelete._id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      });
      return;
    }

    if (osToDelete.logoUrl) {
      await deleteFileFromFirebaseStorage(osToDelete.logoUrl, "product-logo");
    }

    await ProductOs.findByIdAndDelete(osToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting product os:", error);
    throw error;
  }
}
