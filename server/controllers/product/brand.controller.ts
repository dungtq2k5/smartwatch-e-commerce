import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../utils/errorHandler";
import ProductBrand, {
  IProductBrand,
} from "../../models/product/productBrand.model";
import {
  AdminProductBrandListResponse,
  AdminProductBrandResponse,
  ProductBrandBulkDelete,
  ProductBrandCreate,
  ProductBrandListResponse,
  ProductBrandResponse,
  ProductBrandSearchQuery,
  ProductBrandUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatAdminProductBrandResponse,
  formatProductBrandResponse,
  isPresent,
} from "../../utils/utils";
import mongoose, { Types } from "mongoose";
import Product from "../../models/product/product.model";
import { deleteFileFromFirebaseStorage } from "../../utils/firebase";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_PRODUCT_BRANDS_TO_DELETE_BULK } from "../../../common/configs.common";
import User from "../../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating product brand...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { name, logoUrl, description } = req.body as ProductBrandCreate;

  try {
    // Check brand exists
    const existingBrand = await ProductBrand.findOne({
      isDeleted: false,
      name,
    }).lean();
    if (existingBrand) {
      throw new HttpError(409, "Product brand already exists.");
    }

    // Create brand
    const brand = new ProductBrand({
      name,
      logoUrl, // mongoose will save as null since the default value is null
      description,
      createdBy: userId,
    });

    await brand.save();

    res.status(201).json({
      success: true,
      message: "Product brand created successfully.",
      data: formatProductBrandResponse(brand),
    } as SuccessResponse<ProductBrandResponse>);
    console.log("✅ ", "Product brand created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching product brands...");
  const { brandId } = req.params;

  try {
    if (!Types.ObjectId.isValid(brandId)) {
      throw new HttpError(404, "Product brand not found.");
    }

    const brand = await ProductBrand.findById(brandId).lean();
    if (!brand || brand.isDeleted) {
      throw new HttpError(404, "Product brand not found.");
    }

    res.status(200).json({
      success: true,
      message: "Product brand fetched successfully.",
      data: formatProductBrandResponse(brand),
    } as SuccessResponse<ProductBrandResponse>);
    console.log("✅ ", "Product brand fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all product brands...");

  try {
    const brands = await ProductBrand.find({ isDeleted: false }).lean();

    res.status(200).json({
      success: true,
      message: "Product brands fetched successfully.",
      data: {
        brands: {
          total: brands.length,
          brands: brands.map(formatProductBrandResponse),
        },
        offset: 0, // No pagination for this endpoint
        limit: brands.length, // Return all brands
        total: brands.length,
      },
    } as SuccessResponse<ProductBrandListResponse>);
    console.log("✅ ", "Product brands fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin fetching product brand...");
  const { brandId } = req.params;

  try {
    if (!Types.ObjectId.isValid(brandId)) {
      throw new HttpError(404, "Product brand not found.");
    }
    const brand = await ProductBrand.aggregate([
      { $match: { _id: new Types.ObjectId(brandId), isDeleted: false } },
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
    if (!brand) {
      throw new HttpError(404, "Product brand not found.");
    }

    res.status(200).json({
      success: true,
      message: "Product brand fetched successfully.",
      data: formatAdminProductBrandResponse(brand),
    } as SuccessResponse<AdminProductBrandResponse>);
    console.log("✅ ", "Product brand fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin searching product brands...");

  const reqQuery = req["sanitizedQuery"] as ProductBrandSearchQuery;

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
    const aggregationResult = await ProductBrand.aggregate([
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

    const brands: AdminProductBrandResponse[] = aggregationResult[0].data.map(
      formatAdminProductBrandResponse,
    );
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Product brands fetched successfully.",
      data: {
        total,
        brands: {
          total: brands.length,
          brands,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminProductBrandListResponse>);
    console.log("✅ ", "Product brands fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating product brand...");
  const { brandId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check brand exists
    if (!Types.ObjectId.isValid(brandId)) {
      throw new HttpError(404, "Product brand not found.");
    }
    const brand = await ProductBrand.findById(brandId).session(session);
    if (!brand || brand.isDeleted) {
      throw new HttpError(404, "Product brand not found.");
    }

    // Check if name is updated and exists
    const updateData = req.body as ProductBrandUpdate;

    const updatedName = updateData.name || brand.name;
    if (updatedName !== brand.name) {
      const existingBrand = await ProductBrand.findOne({
        isDeleted: false,
        name: updatedName,
      }).lean();
      if (existingBrand) {
        throw new HttpError(409, "Product brand already exists.");
      }
    }

    const updatedLogoUrl =
      updateData.logoUrl === null ? null : updateData.logoUrl || brand.logoUrl;
    if (updatedLogoUrl !== brand.logoUrl && brand.logoUrl) {
      await deleteFileFromFirebaseStorage(brand.logoUrl, "product-logo");
    }

    brand.name = updatedName;
    brand.logoUrl = updatedLogoUrl;
    brand.description =
      updateData.description === null
        ? null
        : updateData.description || brand.description;

    await brand.save({ session });

    const createdByUser = await User.findById(brand.createdBy)
      .select("fullName")
      .lean()
      .session(session);
    if (!createdByUser) {
      throw new HttpError(500, "Creator user not found.");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product brand updated successfully.",
      data: formatAdminProductBrandResponse({
        ...brand.toObject(),
        createdBy: {
          _id: brand.createdBy,
          fullName: createdByUser.fullName,
        },
      }),
    } as SuccessResponse<AdminProductBrandResponse>);
    console.log("✅ ", "Product brand updated successfully.");
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
  console.log("▶️ ", "Deleting product brand...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { brandId } = req.params;

  try {
    // Check brand exists
    if (!Types.ObjectId.isValid(brandId)) {
      throw new HttpError(404, "Product brand not found.");
    }
    const brand = await ProductBrand.findById(brandId);
    if (!brand || brand.isDeleted) {
      throw new HttpError(404, "Product brand not found.");
    }

    await executeDeletion(brand, new Types.ObjectId(userId));

    res.status(200).json({
      success: true,
      message: "Product brand deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product brand deleted successfully.");
  } catch (error) {
    next(error);
  }
}

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk deleting product brands...");

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

  const { brandIds: brandIdsToDelete } = req.body as ProductBrandBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (brandIdsToDelete.length > MAX_PRODUCT_BRANDS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_PRODUCT_BRANDS_TO_DELETE_BULK} product brands at once.`,
      );
    }

    // Delete brands, if brand not found -> skip and continue
    for (const brandId of brandIdsToDelete) {
      const brand = Types.ObjectId.isValid(brandId)
        ? await ProductBrand.findById(brandId).session(session)
        : null;
      if (brand && !brand.isDeleted) {
        await executeDeletion(brand, new Types.ObjectId(reqUserId));
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product brands deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product brands deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(
  brandId: Types.ObjectId | string,
): Promise<boolean> {
  console.log("▶️ ", "Checking brand constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - Products (brandId)
    */
    const constraintChecks = [Product.exists({ brandId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for brand: ${brandId}. Soft delete required.`,
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for brand: ${brandId}. Hard delete allowed.`,
      );
    }
    return hasConstraints;
  } catch (error) {
    console.error("❌ ", "Error checking brand constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  brandToDelete: IProductBrand,
  deletedBy: Types.ObjectId,
): Promise<void> {
  try {
    if (await hasConstraints(brandToDelete._id)) {
      // Soft delete
      await ProductBrand.findByIdAndUpdate(brandToDelete._id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      });
      return;
    }

    if (brandToDelete.logoUrl) {
      await deleteFileFromFirebaseStorage(
        brandToDelete.logoUrl,
        "product-logo",
      );
    }

    await ProductBrand.findByIdAndDelete(brandToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting product brand:", error);
    throw error;
  }
}
