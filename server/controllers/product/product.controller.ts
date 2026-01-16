import { Request, Response, NextFunction } from "express";
import Product, { IProduct } from "../../models/product/product.model";
import { HttpError } from "../../utils/errorHandler";
import ProductBrand from "../../models/product/productBrand.model";
import ProductCategory from "../../models/product/productCategory.model";
import type {
  AdminProductDetailsResponse,
  AdminProductListResponse,
  AdminProductResponse,
  ProductBulkDelete,
  ProductCreate,
  ProductDetailQuery,
  ProductDetailsResponse,
  ProductListResponse,
  ProductResponse,
  ProductSearchQuery,
  ProductUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatAdminModelVariationResponse,
  formatAdminProductModelResponse,
  formatAdminProductResponse,
  formatModelVariationResponse,
  formatProductBrandResponse,
  formatProductCategoryResponse,
  formatProductModelResponse,
  formatProductResponse,
  isPresent,
} from "../../utils/utils";
import mongoose, { Types } from "mongoose";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import ProductModel from "../../models/product/productModel.model";
import ModelVariation from "../../models/product/modelVariation.model";
import Cart from "../../models/user/cart.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_PRODUCTS_TO_DELETE_BULK } from "../../../common/configs.common";

// --- BOTH ADMIN AND BUYER FUNCTIONS ---

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching product...");
  const { productId } = req.params;

  try {
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(productId)
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

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching product's models and variations...");
  const { productId } = req.params;
  const reqQuery = req["sanitizedQuery"] as ProductDetailQuery;

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
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(
        404,
        "Fetching product with models and variations...."
      );
    }

    const productDetails = await Product.aggregate([
      { $match: { _id: new Types.ObjectId(productId), isDeleted: false } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "productbrands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
          pipeline: [OPTIMIZE_PIPELINE],
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "productcategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [OPTIMIZE_PIPELINE],
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
                pipeline: [OPTIMIZE_PIPELINE],
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
                  OPTIMIZE_PIPELINE,
                ],
              },
            },
            OPTIMIZE_PIPELINE,
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

    const data: ProductDetailsResponse = {
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
    } as SuccessResponse<ProductDetailsResponse>);
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
  const reqQuery = req["sanitizedQuery"] as ProductSearchQuery;

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

  if (reqQuery.type) query.type = reqQuery.type;

  if (reqQuery.brandIds?.length) {
    // Valid ID was handled in middleware
    query.brandId = {
      $in: reqQuery.brandIds.map((id) => new Types.ObjectId(id)),
    };
  }

  if (reqQuery.categoryIds?.length) {
    // Valid ID was handled in middleware
    query.categoryId = {
      $in: reqQuery.categoryIds.map((id) => new Types.ObjectId(id)),
    };
  }

  if (reqQuery.stopSelling) {
    query.stopSelling = reqQuery.stopSelling === "true";
  }

  if (reqQuery.priceCentsMin || reqQuery.priceCentsMax) {
    query.basePriceCents = {};
    if (reqQuery.priceCentsMin) {
      query.basePriceCents.$gte = Number.parseInt(reqQuery.priceCentsMin, 10);
    }
    if (reqQuery.priceCentsMax) {
      query.basePriceCents.$lte = Number.parseInt(reqQuery.priceCentsMax, 10);
    }
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await Product.aggregate([
      { $match: { isDeleted: false, ...query } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "productbrands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
          pipeline: [OPTIMIZE_PIPELINE],
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "productcategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [OPTIMIZE_PIPELINE],
        },
      },
      { $unwind: "$category" },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const products: ProductResponse[] = aggregationResult[0].data.map(
      formatProductResponse
    );
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Products searched successfully.",
      data: {
        total,
        products: {
          total: products.length,
          products,
        },
        offset,
        limit,
      },
    } as SuccessResponse<ProductListResponse>);
    console.log("✅ ", "Products searched successfully.");
  } catch (error) {
    next(error);
  }
}

// --- ADMIN FUNCTIONS ---

export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin fetching product...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { productId } = req.params;

  try {
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found.");
    }
    const aggregationResult = await Product.aggregate([
      { $match: { _id: new Types.ObjectId(productId), isDeleted: false } },
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
          from: "productmodels",
          localField: "_id",
          foreignField: "productId",
          pipeline: [{ $match: { isDeleted: false } }],
          as: "models",
        },
      },
      {
        $addFields: {
          totalModels: { $size: "$models" },
        },
      },
      {
        $lookup: {
          from: "modelvariations",
          localField: "models._id",
          foreignField: "productModelId",
          pipeline: [{ $match: { isDeleted: false } }],
          as: "variations",
        },
      },
      {
        $addFields: {
          totalVariations: { $size: "$variations" },
        },
      },
      {
        $project: {
          models: 0,
          variations: 0,
        },
      },
    ]);

    if (aggregationResult.length === 0) {
      throw new HttpError(404, "Product not found.");
    }

    res.status(200).json({
      success: true,
      message: "Admin product fetched successfully.",
      data: formatAdminProductResponse(aggregationResult[0]),
    } as SuccessResponse<AdminProductResponse>);
    console.log("✅ ", "Admin product fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// Similar to getDetails but with more details like totalModels, totalVariations, createdBy
export async function adminGetDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin fetching product's models and variations...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { productId } = req.params;
  const reqQuery = req["sanitizedQuery"] as ProductDetailQuery;

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
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found.");
    }

    const productDetails = await Product.aggregate([
      { $match: { _id: new Types.ObjectId(productId), isDeleted: false } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "productbrands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
          pipeline: [OPTIMIZE_PIPELINE],
        },
      },
      { $unwind: "$brand" },
      {
        $lookup: {
          from: "productcategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
          pipeline: [OPTIMIZE_PIPELINE],
        },
      },
      { $unwind: "$category" },
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
                pipeline: [OPTIMIZE_PIPELINE],
              },
            },
            { $unwind: "$config.os" },
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
                from: "modelvariations",
                localField: "_id",
                foreignField: "productModelId",
                as: "variations",
                pipeline: [
                  { $match: variationQueryMatch },
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
                  OPTIMIZE_PIPELINE,
                ],
              },
            },
            {
              $addFields: {
                totalVariations: { $size: "$variations" },
              },
            },
            OPTIMIZE_PIPELINE,
          ],
        },
      },
      {
        $addFields: {
          totalModels: { $size: "$models" },
          totalVariations: {
            $sum: {
              $map: {
                input: "$models",
                as: "model",
                in: { $size: "$$model.variations" },
              },
            },
          },
        },
      },
    ]);

    if (productDetails.length === 0) {
      throw new HttpError(404, "Product not found.");
    }

    const productDetail = productDetails[0];
    const formattedModels = productDetail.models.map((model: any) => {
      const formattedVariations = model.variations.map(
        formatAdminModelVariationResponse
      );

      return {
        ...formatAdminProductModelResponse(model),
        variations: {
          total: formattedVariations.length,
          variations: formattedVariations,
        },
      };
    });

    const { brandId, categoryId, ...restProductDetailData } =
      formatAdminProductResponse(productDetail);
    const data: AdminProductDetailsResponse = {
      ...restProductDetailData,
      brand: formatProductBrandResponse(productDetail.brand),
      category: formatProductCategoryResponse(productDetail.category),
      models: {
        total: formattedModels.length,
        models: formattedModels,
      },
    };

    res.status(200).json({
      success: true,
      message: "Admin product detail fetched successfully.",
      data,
    } as SuccessResponse<AdminProductDetailsResponse>);
    console.log("✅ ", "Admin product detail fetched successfully.");
  } catch (error) {
    next(error);
  }
}

// Similar to search but with more details like totalModels, totalVariations, createdBy
export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin searching products...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const reqQuery = req["sanitizedQuery"] as ProductSearchQuery;

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

  if (reqQuery.type) query.type = reqQuery.type;

  if (reqQuery.brandIds?.length) {
    // Valid ID was handled in middleware
    query.brandId = {
      $in: reqQuery.brandIds.map((id) => new Types.ObjectId(id)),
    };
  }

  if (reqQuery.categoryIds?.length) {
    // Valid ID was handled in middleware
    query.categoryId = {
      $in: reqQuery.categoryIds.map((id) => new Types.ObjectId(id)),
    };
  }

  if (reqQuery.stopSelling) {
    query.stopSelling = reqQuery.stopSelling === "true";
  }

  if (reqQuery.priceCentsMin || reqQuery.priceCentsMax) {
    query.basePriceCents = {};
    if (reqQuery.priceCentsMin) {
      query.basePriceCents.$gte = Number.parseInt(reqQuery.priceCentsMin, 10);
    }
    if (reqQuery.priceCentsMax) {
      query.basePriceCents.$lte = Number.parseInt(reqQuery.priceCentsMax, 10);
    }
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await Product.aggregate([
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
        $lookup: {
          from: "productmodels",
          localField: "_id",
          foreignField: "productId",
          pipeline: [{ $match: { isDeleted: false } }],
          as: "models",
        },
      },
      {
        $addFields: {
          totalModels: { $size: "$models" },
        },
      },
      {
        $lookup: {
          from: "modelvariations",
          localField: "models._id",
          foreignField: "productModelId",
          pipeline: [{ $match: { isDeleted: false } }],
          as: "variations",
        },
      },
      {
        $addFields: {
          totalVariations: { $size: "$variations" },
        },
      },
      {
        $project: {
          models: 0,
          variations: 0,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const products: AdminProductResponse[] = aggregationResult[0].data.map(
      formatAdminProductResponse
    );
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Admin products searched successfully.",
      data: {
        total,
        products: {
          total: products.length,
          products,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminProductListResponse>);
    console.log("✅ ", "Admin products searched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
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

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product...");
  const { productId } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(productId);
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
    const imageUrls = updateData.imageUrls;
    if (imageUrls && imageUrls.length > 0) {
      const imgUrlToRemove = product.imageUrls.filter(
        (url) => !imageUrls.includes(url)
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
    product.imageUrls =
      imageUrls === null ? [] : imageUrls || product.imageUrls;
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

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }

  const { productId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(productId).session(session);
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found.");
    }

    await executeDeletion(product, new Types.ObjectId(userId), session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product deleted successfully.");
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
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Bulk deleting products...");

  const [reqUserId, isBuyerOnly] = [
    req["auth"]?.userId,
    req["auth"]?.isBuyerOnly,
  ];
  if (!isPresent(reqUserId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or isBuyerOnly not found, this should be handled in middlewares."
      )
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action.")
    );
  }

  const { productIds: productIdsToDelete } = req.body as ProductBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (productIdsToDelete.length > MAX_PRODUCTS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_PRODUCTS_TO_DELETE_BULK} products at once.`
      );
    }

    // Delete products, if product not found -> skip and continue
    for (const productId of productIdsToDelete) {
      const product = Types.ObjectId.isValid(productId)
        ? await Product.findById(productId).session(session)
        : null;
      if (product && !product.isDeleted) {
        await executeDeletion(product, new Types.ObjectId(reqUserId), session);
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Products deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Products deleted successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---

async function hasConstraints(productId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking product constraints...");

  try {
    /*
      None-blocking constraints: product -> productModel -> modelVariation -> (in users' carts)
      Blocking constraints: product -> productModel -> modelVariation (stockQuantity > 0)
    */

    const models = await ProductModel.find({
      productId,
    })
      .select("_id")
      .lean();

    if (models.length === 0) {
      console.log(
        `✅ `,
        `No models found for product: ${productId}. Hard delete allowed.`
      );
      return false;
    }

    const modelIds = models.map((model) => model._id);
    const hasStock = await ModelVariation.exists({
      productModelId: { $in: modelIds },
      stockQuantity: { $gt: 0 },
    });

    if (hasStock) {
      console.log(
        `▶️ `,
        `Critical constraints (stock > 0) found for product: ${productId}. Soft delete required.`
      );
      return true;
    }

    console.log(
      `✅ `,
      `No critical constraints found for product: ${productId}. Hard delete allowed.`
    );
    return false;
  } catch (error) {
    console.error("❌ ", "Error checking product constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  productToDelete: IProduct,
  deletedBy: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  try {
    /*
      Business logic:
        - Check root constraints (stockQuantity in modelVariation) before make hard or soft delete.
        - Hard delete: delete related variations (also in user's cart) -> delete related models -> delete product -> delete images from Firebase Storage.
        - Soft delete: soft delete related variations -> soft delete related models -> soft delete product.
    */

    const productId = productToDelete._id;
    const models = await ProductModel.find({ productId })
      .session(session)
      .lean();
    const modelIds = models.map((model) => model._id);
    const variations =
      modelIds.length > 0
        ? await ModelVariation.find({ productModelId: { $in: modelIds } })
            .session(session)
            .lean()
        : [];
    const variationIds = variations.map((variation) => variation._id);

    if (await hasConstraints(productId)) {
      // -- Soft delete
      console.log(
        `▶️ `,
        `Soft deleting product ${productId} and its children...`
      );

      const softDeleteUpdate = {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      };

      // Soft delete variations
      if (variationIds.length > 0) {
        await ModelVariation.updateMany(
          { _id: { $in: variationIds } },
          softDeleteUpdate,
          { session }
        );
      }

      // Soft delete models
      if (modelIds.length > 0) {
        await ProductModel.updateMany(
          { _id: { $in: modelIds } },
          softDeleteUpdate,
          { session }
        );
      }

      // Soft delete product
      await Product.findByIdAndUpdate(productId, softDeleteUpdate, { session });
      return;
    }

    // -- Hard delete
    console.log(
      `▶️ `,
      `Hard deleting product ${productId} and its children...`
    );

    // Delete variations and carts
    if (variationIds.length > 0) {
      await Cart.deleteMany({ variationId: { $in: variationIds } }).session(
        session
      );
      await ModelVariation.deleteMany({ _id: { $in: variationIds } }).session(
        session
      );
    }

    // Delete models
    if (modelIds.length > 0) {
      await ProductModel.deleteMany({ _id: { $in: modelIds } }).session(
        session
      );
    }

    // Delete product
    await Product.findByIdAndDelete(productId).session(session);

    // Delete images from Firebase Storage
    const imgUrlsToDelete = [...productToDelete.imageUrls];
    for (const model of models) imgUrlsToDelete.push(...model.imageUrls);
    for (const variation of variations)
      imgUrlsToDelete.push(...variation.imageUrls);

    if (imgUrlsToDelete.length > 0) {
      await deleteManyFileFromFirebaseStorage(imgUrlsToDelete, "product-image");
    }
  } catch (error) {
    console.error("❌ ", "Error deleting product:", error);
    throw error;
  }
}
