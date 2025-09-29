import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import { HttpError } from "../../utils/errorHandler";
import ProductCategory, { IProductCategory } from "../../models/product/productCategory.model";
import {
  ProductCategoryCreate,
  ProductCategoryListResponse,
  ProductCategoryResponse,
  ProductCategoryUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { formatProductCategoryResponse } from "../../utils/utils";
import { Types } from "mongoose";
import Product from "../../models/product/product.model";
import { formatError } from "../../../common/utils.common";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product category...");
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
    const { userId } = req["auth"] as RequestAuth;
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
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching product categories...");
  const { id } = req.params;

  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category = await ProductCategory.findById(id).lean();
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
  next: NextFunction
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

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product category...");
  const { id } = req.params;

  try {
    // Check category exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category = await ProductCategory.findById(id);
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

    await category.save();

    res.status(200).json({
      success: true,
      message: "Product category updated successfully.",
      data: formatProductCategoryResponse(category),
    } as SuccessResponse<ProductCategoryResponse>);
    console.log("✅ ", "Product category updated successfully.");
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting product category...");
  const { id } = req.params;

  try {
    // Check category exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Product category not found.");
    }
    const category = await ProductCategory.findById(id);
    if (!category || category.isDeleted) {
      throw new HttpError(404, "Product category not found.");
    }

    const userId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(category, userId);

    res.status(200).json({
      success: true,
      message: "Product category deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product category deleted successfully.");
  } catch (error) {
    next(error);
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
        `Critical constraints found for category: ${categoryId}. Soft delete required.`
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for category: ${categoryId}. Hard delete allowed.`
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
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(categoryToDelete._id)) {
      // Soft delete
      await ProductCategory.findByIdAndUpdate(
        categoryToDelete._id,
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
      );
      return;
    }

    await ProductCategory.findByIdAndDelete(categoryToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting product category:", error);
    throw error;
  }
}
