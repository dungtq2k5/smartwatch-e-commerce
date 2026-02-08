import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../utils/errorHandler";
import ProductCategory, {
  IProductCategory,
} from "../../models/product/productCategory.model";
import {
  AdminProductCategoryListResponse,
  AdminProductCategoryResponse,
  ProductCategoryBulkDelete,
  ProductCategoryCreate,
  ProductCategoryListResponse,
  ProductCategoryResponse,
  ProductCategorySearchQuery,
  ProductCategoryUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatAdminProductCategoryResponse,
  formatProductCategoryResponse,
  isPresent,
} from "../../utils/utils";
import mongoose, { Types } from "mongoose";
import Product from "../../models/product/product.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK } from "../../../common/configs.common";
import User from "../../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating product category...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { name, description } = req.body as ProductCategoryCreate;

  try {
    // Check category exists
    const existingCategory = await ProductCategory.findOne({
      isDeleted: false,
      name,
    }).lean();
    if (existingCategory) {
      throw new HttpError(409, "Product category already exists.");
    }

    // Create category
    const category = new ProductCategory({
      name,
      description,
      createdBy: userId,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Product category created successfully.",
      data: formatProductCategoryResponse(category),
    } as SuccessResponse<ProductCategoryResponse>);
    console.log("✅ ", "Product category created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching product categories...");
  const { categoryId } = req.params;

  try {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category = await ProductCategory.findById(categoryId).lean();
    if (!category || category.isDeleted) {
      throw new HttpError(404, "Product category not found.");
    }

    res.status(200).json({
      success: true,
      message: "Product category fetched successfully.",
      data: formatProductCategoryResponse(category),
    } as SuccessResponse<ProductCategoryResponse>);
    console.log("✅ ", "Product category fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all product categories...");

  try {
    const categories = await ProductCategory.find({ isDeleted: false }).lean();

    res.status(200).json({
      success: true,
      message: "Product categories fetched successfully.",
      data: {
        categories: {
          total: categories.length,
          categories: categories.map(formatProductCategoryResponse),
        },
        offset: 0, // No pagination for this endpoint
        limit: categories.length, // Return all categories
        total: categories.length,
      },
    } as SuccessResponse<ProductCategoryListResponse>);
    console.log("✅ ", "Product categories fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin fetching product category...");
  const { categoryId } = req.params;

  try {
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category = await ProductCategory.aggregate([
      { $match: { _id: new Types.ObjectId(categoryId), isDeleted: false } },
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
    if (!category) {
      throw new HttpError(404, "Product category not found.");
    }

    res.status(200).json({
      success: true,
      message: "Product category fetched successfully.",
      data: formatAdminProductCategoryResponse(category),
    } as SuccessResponse<AdminProductCategoryResponse>);
    console.log("✅ ", "Product category fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin searching product categories...");

  const reqQuery = req["sanitizedQuery"] as ProductCategorySearchQuery;

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
    const aggregationResult = await ProductCategory.aggregate([
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

    const categories: AdminProductCategoryResponse[] =
      aggregationResult[0].data.map(formatAdminProductCategoryResponse);
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Product categories fetched successfully.",
      data: {
        total,
        categories: {
          total: categories.length,
          categories,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminProductCategoryListResponse>);
    console.log("✅ ", "Product categories fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating product category...");
  const { categoryId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check category exists
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category =
      await ProductCategory.findById(categoryId).session(session);
    if (!category || category.isDeleted) {
      throw new HttpError(404, "Product category not found.");
    }

    // Check if name is updated and exists
    const updateData = req.body as ProductCategoryUpdate;

    const updatedName = updateData.name || category.name;
    if (updatedName !== category.name) {
      const existingCategory = await ProductCategory.findOne({
        isDeleted: false,
        name: updatedName,
      }).lean();
      if (existingCategory) {
        throw new HttpError(409, "Product category already exists.");
      }
    }

    category.name = updatedName;
    category.description =
      updateData.description === null
        ? null
        : updateData.description || category.description;

    await category.save({ session });

    const createdByUser = await User.findById(category.createdBy)
      .select("_id fullName")
      .lean()
      .session(session);
    if (!createdByUser) {
      throw new HttpError(500, "Creator user not found.");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product category updated successfully.",
      data: formatProductCategoryResponse({
        ...category.toObject(),
        createdBy: {
          _id: category.createdBy,
          fullName: createdByUser.fullName,
        },
      }),
    } as SuccessResponse<ProductCategoryResponse>);
    console.log("✅ ", "Product category updated successfully.");
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
  console.log("▶️ ", "Deleting product category...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { categoryId } = req.params;

  try {
    // Check category exists
    if (!Types.ObjectId.isValid(categoryId)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category = await ProductCategory.findById(categoryId);
    if (!category || category.isDeleted) {
      throw new HttpError(404, "Product category not found.");
    }

    await executeDeletion(category, new Types.ObjectId(userId));

    res.status(200).json({
      success: true,
      message: "Product category deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product category deleted successfully.");
  } catch (error) {
    next(error);
  }
}

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk deleting product categories...");

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

  const { categoryIds: categoryIdsToDelete } =
    req.body as ProductCategoryBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (categoryIdsToDelete.length > MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK} product categories at once.`,
      );
    }

    // Delete categories, if category not found -> skip and continue
    for (const categoryId of categoryIdsToDelete) {
      const category = Types.ObjectId.isValid(categoryId)
        ? await ProductCategory.findById(categoryId).session(session)
        : null;
      if (category && !category.isDeleted) {
        await executeDeletion(category, new Types.ObjectId(reqUserId));
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product categories deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product categories deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(categoryId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking category constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - Products (categoryId)
    */
    const constraintChecks = [Product.exists({ categoryId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for category: ${categoryId}. Soft delete required.`,
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for category: ${categoryId}. Hard delete allowed.`,
      );
    }
    return hasConstraints;
  } catch (error) {
    console.error("❌ ", "Error checking category constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  categoryToDelete: IProductCategory,
  deletedBy: Types.ObjectId,
): Promise<void> {
  try {
    if (await hasConstraints(categoryToDelete._id)) {
      // Soft delete
      await ProductCategory.findByIdAndUpdate(categoryToDelete._id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      });
      return;
    }

    await ProductCategory.findByIdAndDelete(categoryToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting product category:", error);
    throw error;
  }
}
