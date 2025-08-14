import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import Product from "../../models/product/product.model";
import { HttpError } from "../../utils/errorHandler";
import ProductBrand from "../../models/product/productBrand.model";
import ProductCategory from "../../models/product/productCategory.model";
import type {
  ProductCreate,
  ProductDetailQuery,
  ProductDetailResponse,
  ProductListResponse,
  ProductResponse,
  ProductSearchQuery,
  ProductUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatModelVariationResponse,
  formatProductModelResponse,
  formatProductResponse,
} from "../../utils/utils";
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
    type,
    brandId,
    categoryId,
    description,
    imageUrls,
    stopSelling,
    basePriceCents,
  } = req.body as ProductCreate;

  try {
    // Check product exists
    const existingProduct = await Product.findOne({
      isDeleted: false,
      name,
    }).lean();
    if (existingProduct) {
      throw new HttpError(409, "Product with this name already exists.");
    }

    // Check brand exists
    const existingBrand = await ProductBrand.findById(brandId).lean();
    if (!existingBrand || existingBrand.isDeleted) {
      throw new HttpError(404, "Brand not found.");
    }

    // Check category exists
    const existingCategory = await ProductCategory.findById(categoryId).lean();
    if (!existingCategory || existingCategory.isDeleted) {
      throw new HttpError(404, "Category not found.");
    }

    // Create product
    const { userId } = req["auth"] as RequestAuth;
    const product = new Product({
      name,
      type,
      brandId,
      categoryId,
      description,
      imageUrls,
      stopSelling,
      basePriceCents,
      createdBy: userId,
    });

    await product.save();
    await product.populate(["brand", "category"]);

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
    const product = await Product.findById(id)
      .populate(["brand", "category"])
      .lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found.");
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

export async function getWithModelsAndVariations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching product's models and variations...");
  const { id } = req.params;
  const reqQuery = req.query as ProductDetailQuery;

  const modelQueryMatch: any = { isDeleted: false };
  const variationQueryMatch: any = { isDeleted: false };

  if (reqQuery.modelStopSelling) {
    modelQueryMatch.stopSelling = reqQuery.modelStopSelling === "true";
  }
  if (reqQuery.variationStopSelling) {
    variationQueryMatch.stopSelling = reqQuery.variationStopSelling === "true";
  }

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(
        404,
        "Fetching product with models and variations...."
      );
    }

    const productDetails = await Product.aggregate([
      { $match: { _id: new Types.ObjectId(id), isDeleted: false } },
      {
        $lookup: {
          from: "productbrands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "productcategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "productmodels",
          localField: "_id",
          foreignField: "productId",
          as: "models",
          pipeline: [
            { $match: modelQueryMatch },
            {
              $lookup: {
                from: "productos",
                localField: "config.osId",
                foreignField: "_id",
                as: "config.os",
              },
            },
            { $unwind: "$config.os" },
            {
              $lookup: {
                from: "modelvariations",
                localField: "_id",
                foreignField: "productModelId",
                as: "variations",
                pipeline: [
                  {
                    $match: variationQueryMatch,
                  },
                ],
              },
            },
          ],
        },
      },
    ]);

    if (productDetails.length === 0) {
      throw new HttpError(404, "Product not found.");
    }

    const productDetail = productDetails[0];

    const formattedModels = productDetail.models.map((model: any) => {
      const formattedVariations = model.variations.map((variation: any) =>
        formatModelVariationResponse(variation)
      );
      return {
        ...formatProductModelResponse(model),
        variations: {
          total: formattedVariations.length,
          variations: formattedVariations,
        },
      };
    });

    const data: ProductDetailResponse = {
      ...formatProductResponse(productDetail),
      models: {
        total: formattedModels.length,
        models: formattedModels,
      },
    };

    res.status(200).json({
      success: true,
      message: "Product detail fetched successfully.",
      data,
    } as SuccessResponse<ProductDetailResponse>);
    console.log("✅ ", "Product detail fetched successfully.");
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
  const reqQuery = req.query as ProductSearchQuery;

  const limit = reqQuery.limit ? parseInt(reqQuery.limit) : 9;
  const offset = reqQuery.offset ? parseInt(reqQuery.offset) : 0;
  const query: any = {};

  if (reqQuery.searchTerm) {
    query.$or = [
      { name: { $regex: reqQuery.searchTerm, $options: "i" } },
      {
        description: { $regex: reqQuery.searchTerm, $options: "i" },
      },
    ];
  }

  if (reqQuery.type) query.type = reqQuery.type;

  if (reqQuery.brandId) {
    if (!Types.ObjectId.isValid(reqQuery.brandId)) {
      throw new HttpError(400, "Invalid brand ID.");
    }
    query.brandId = new Types.ObjectId(reqQuery.brandId);
  }

  if (reqQuery.categoryId) {
    if (!Types.ObjectId.isValid(reqQuery.categoryId)) {
      throw new HttpError(400, "Invalid category ID.");
    }
    query.categoryId = new Types.ObjectId(reqQuery.categoryId);
  }

  if (reqQuery.stopSelling) {
    query.stopSelling = reqQuery.stopSelling === "true";
  }

  if (reqQuery.priceCentsMin || reqQuery.priceCentsMax) {
    query.basePriceCents = {};
    if (reqQuery.priceCentsMin) {
      query.basePriceCents.$gte = parseInt(reqQuery.priceCentsMin, 10);
    }
    if (reqQuery.priceCentsMax) {
      query.basePriceCents.$lte = parseInt(reqQuery.priceCentsMax, 10);
    }
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await Product.aggregate([
      { $match: { isDeleted: false, ...query } },
      {
        $lookup: {
          from: "productbrands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "productcategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortStage },
            { $skip: offset },
            { $limit: limit },
            // { Use format function instead
            //   $project: {
            //     id: "$_id", // Rename _id to id
            //     _id: 0, // Exclude _id from output
            //     name: 1,
            //     brand: 1,
            //     category: 1,
            //     imageUrls: 1,
            //     basePriceCents: 1,
            //     description: 1,
            //     createdBy: 1,
            //     createdAt: 1,
            //     updatedAt: 1,
            //     stopSelling: 1,
            //   },
            // },
          ],
        },
      },
    ]);

    const products: ProductResponse[] = aggregationResult[0].data.map(
      (product: any) => formatProductResponse(product)
    );
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Products searched successfully.",
      data: {
        products: {
          total: products.length,
          products,
        },
        offset,
        limit,
        total,
      },
    } as SuccessResponse<ProductListResponse>);
    console.log("✅ ", "Products searched successfully.");
  } catch (error) {
    next(error);
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
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found.");
    }

    // Business logic
    const updateData = req.body as ProductUpdate;

    // Check product exists with name and update
    const updatedName = updateData.name || product.name;
    if (updatedName !== product.name) {
      const existingProduct = await Product.findOne({
        isDeleted: false,
        name: updatedName,
      }).lean();
      if (existingProduct) {
        throw new HttpError(409, "Product with this name already exists.");
      }
    }

    // Check brand exists and update
    const updatedBrandId = updateData.brandId
      ? new Types.ObjectId(updateData.brandId)
      : product.brandId;
    if (!updatedBrandId.equals(product.brandId)) {
      if (!Types.ObjectId.isValid(updatedBrandId)) {
        throw new HttpError(404, "Brand not found.");
      }
      const existingBrand = await ProductBrand.findById(updatedBrandId).lean();
      if (!existingBrand || existingBrand.isDeleted) {
        throw new HttpError(404, "Brand not found.");
      }
    }

    // Check category exists and update
    const updatedCategoryId = updateData.categoryId
      ? new Types.ObjectId(updateData.categoryId)
      : product.categoryId;
    if (!updatedCategoryId.equals(product.categoryId)) {
      if (!Types.ObjectId.isValid(updatedCategoryId)) {
        throw new HttpError(404, "Category not found.");
      }
      const existingCategory = await ProductCategory.findById(
        updatedCategoryId
      ).lean();
      if (!existingCategory || existingCategory.isDeleted) {
        throw new HttpError(404, "Category not found.");
      }
    }

    // Update imageUrls on Firebase Storage
    if (updateData.imageUrls) {
      const imgUrlToRemove = product.imageUrls!.filter(
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
    product.type = updateData.type || product.type;
    product.brandId = updatedBrandId;
    product.categoryId = updatedCategoryId;
    product.description = updateData.description || product.description;
    product.imageUrls = updateData.imageUrls || product.imageUrls;
    product.stopSelling = updateData.stopSelling ?? product.stopSelling;
    product.basePriceCents =
      updateData.basePriceCents ?? product.basePriceCents;

    await product.save();
    await product.populate(["brand", "category"]);

    res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: formatProductResponse(product),
    } as SuccessResponse<ProductResponse>);
    console.log("✅ ", "Product updated successfully.");
  } catch (error) {
    next(error);
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
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(id);
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found.");
    }

    const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(product, reqUserId);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product deleted successfully.");
  } catch (error) {
    next(error);
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
    throw new Error(error);
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
    throw new Error(error);
  }
}
