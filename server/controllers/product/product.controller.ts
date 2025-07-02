import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import Product from "../../models/product/product.model";
import { errorHandler } from "../../utils/errorHandler";
import ProductBrand from "../../models/product/productBrand.model";
import ProductCategory from "../../models/product/productCategory.model";
import {
  ProductCreate,
  ProductListResponse,
  ProductResponse,
  ProductUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { formatProductResponse } from "../../utils/utils";
import { Types } from "mongoose";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import ProductModel from "../../models/product/productModel.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product...");
  const {
    name,
    brandId,
    categoryId,
    description,
    imageUrls,
    stopSelling,
  } = req.body as ProductCreate;

  try {
    // Check product exists
    const existingProduct = await Product.findOne({
      isDeleted: false,
      name,
    });
    if (existingProduct) {
      return next(errorHandler(404, "Product with this name already exists."));
    }

    // Check brand exists
    const existingBrand = await ProductBrand.findById(brandId);
    if (!existingBrand || existingBrand.isDeleted) {
      return next(errorHandler(404, "Brand not found."));
    }

    // Check category exists
    const existingCategory = await ProductCategory.findById(categoryId);
    if (!existingCategory || existingCategory.isDeleted) {
      return next(errorHandler(404, "Category not found."));
    }

    // Create product
    const { userId } = req["auth"] as RequestAuth;
    const product = new Product({
      name,
      brandId,
      categoryId,
      description,
      imageUrls,
      stopSelling,
      createdBy: userId,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: formatProductResponse(product),
    } as SuccessResponse<ProductResponse>);
    console.log("✅ ", "Product created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching product...");
  const { id } = req.params;

  try {
    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      data: formatProductResponse(product),
    } as SuccessResponse<ProductResponse>);
    console.log("✅ ", "Product fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Searching products...");
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 9;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const query: any = {};

  if (req.query.searchTerm) {
    query.$or = [
      { name: { $regex: req.query.searchTerm as string, $options: "i" } },
      {
        description: { $regex: req.query.searchTerm as string, $options: "i" },
      },
    ];
  }

  if (req.query.brandId) {
    if (!Types.ObjectId.isValid(req.query.brandId as string)) {
      return next(errorHandler(400, "Invalid brand ID."));
    }
    query.brandId = new Types.ObjectId(req.query.brandId as string);
  }

  if (req.query.categoryId) {
    if (!Types.ObjectId.isValid(req.query.categoryId as string)) {
      return next(errorHandler(400, "Invalid category ID."));
    }
    query.categoryId = new Types.ObjectId(req.query.categoryId as string);
  }

  if (req.query.stopSelling) {
    query.stopSelling = req.query.stopSelling === "true";
  }

  const sort = ((req.query.sortBy as string) || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await Product.aggregate([
      { $match: { isDeleted: false, ...query } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortStage },
            { $skip: offset },
            { $limit: limit },
            {
              $project: {
                id: "$_id", // Rename _id to id
                _id: 0, // Exclude _id from output
                name: 1,
                brandId: 1,
                categoryId: 1,
                description: 1,
                imageUrls: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                stopSelling: 1,
              },
            },
          ],
        },
      },
    ]);

    const products = aggregationResult[0].data;
    const total = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Products searched successfully.",
      data: {
        total,
        products,
        offset,
        limit,
      },
    } as SuccessResponse<ProductListResponse>);
    console.log("✅ ", "Products searched successfully.");
  } catch (error) {
    return next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product...");
  const { id } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Business logic
    const updateData = req.body as ProductUpdate;

    // Check product exists with name and update
    const updatedName = updateData.name || product.name;
    if (updatedName !== product.name) {
      const existingProduct = await Product.findOne({
        isDeleted: false,
        name: updatedName,
      });
      if (existingProduct) {
        return next(
          errorHandler(404, "Product with this name already exists.")
        );
      }
    }

    // Check brand exists and update
    const updatedBrandId = updateData.brandId
      ? new Types.ObjectId(updateData.brandId)
      : product.brandId;
    if (!updatedBrandId.equals(product.brandId)) {
      if (!Types.ObjectId.isValid(updatedBrandId)) {
        return next(errorHandler(404, "Brand not found."));
      }
      const existingBrand = await ProductBrand.findById(updatedBrandId);
      if (!existingBrand || existingBrand.isDeleted) {
        return next(errorHandler(404, "Brand not found."));
      }
    }

    // Check category exists and update
    const updatedCategoryId = updateData.categoryId
      ? new Types.ObjectId(updateData.categoryId)
      : product.categoryId;
    if (!updatedCategoryId.equals(product.categoryId)) {
      if (!Types.ObjectId.isValid(updatedCategoryId)) {
        return next(errorHandler(404, "Category not found."));
      }
      const existingCategory = await ProductCategory.findById(
        updatedCategoryId
      );
      if (!existingCategory || existingCategory.isDeleted) {
        return next(errorHandler(404, "Category not found."));
      }
    }

    // Update imageUrls on Firebase Storage
    if (updateData.imageUrls) {
      const imgUrlToRemove = product.imageUrls.filter(
        (url) => !updateData.imageUrls!.includes(url)
      );
      if (imgUrlToRemove.length > 0) {
        await deleteManyFileFromFirebaseStorage(
          imgUrlToRemove,
          "product-image"
        );
      }
    }

    product.name = updatedName;
    product.brandId = updatedBrandId;
    product.categoryId = updatedCategoryId;
    product.description = updateData.description || product.description;
    product.imageUrls = updateData.imageUrls || product.imageUrls;
    product.stopSelling = updateData.stopSelling ?? product.stopSelling;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: formatProductResponse(product),
    } as SuccessResponse<ProductResponse>);
    console.log("✅ ", "Product updated successfully.");
  } catch (error) {
    return next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting product...");
  const { id } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(product, reqUserId);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product deleted successfully.");
  } catch (error) {
    return next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(productId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking product constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - ProductModel (productId)
    */
    const constraintChecks = [ProductModel.exists({ productId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for product: ${productId}. Soft delete required.`
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for product: ${productId}. Hard delete allowed.`
      );
    }
    return hasConstraints;
  } catch (error) {
    throw error;
  }
}

async function executeDeletion(
  productToDelete: any,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(productToDelete._id)) {
      // Soft delete
      productToDelete.isDeleted = true;
      productToDelete.deletedAt = new Date();
      productToDelete.deletedBy = deletedBy;
      await productToDelete.save();
      return;
    }

    // Handle remove imageUrls on Firebase Storage
    await deleteManyFileFromFirebaseStorage(
      productToDelete.imageUrls,
      "product-image"
    );

    await productToDelete.deleteOne();
  } catch (error) {
    throw error;
  }
}
