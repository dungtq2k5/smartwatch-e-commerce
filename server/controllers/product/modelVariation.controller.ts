import { Request, Response, NextFunction } from "express";
import { Model, Types } from "mongoose";
import { errorHandler } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel from "../../models/product/productModel.model";
import {
  ModelVariationBand,
  ModelVariationColor,
  ModelVariationCreate,
  ModelVariationResponse,
  ModelVariationUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import ModelVariation from "../../models/product/modelVariation.model";
import { RequestAuth } from "../../utils/types";
import { formatModelVariationResponse } from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";

// --- COLOR VARIATION ---
export async function createColor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product model variation...");
  const { productId, modelId } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Business logic
    const { name, colorHex, imageUrls, stopSelling, additionalPriceCents } =
      req.body as ModelVariationCreate<ModelVariationColor>;

    // Check variation exists
    const existingVariation = await ModelVariation.findOne({
      isDeleted: false,
      productModelId: modelId,
      type: "color",
      $or: [{ name }, { colorHex }],
    }).lean();
    if (existingVariation) {
      return next(errorHandler(409, "Product model variation already exists."));
    }

    const reqUserId = (req["auth"] as RequestAuth).userId;
    const variation = new ModelVariation({
      productModelId: modelId,
      type: "color",
      name,
      colorHex,
      imageUrls,
      stopSelling,
      additionalPriceCents,
      createBy: reqUserId,
    });
    await variation.save();

    res.status(201).json({
      success: true,
      message: "Product model variation created successfully.",
      data: formatModelVariationResponse(variation),
    } as SuccessResponse<ModelVariationResponse>);
  } catch (error) {
    next(error);
  }
}

export async function updateColor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product model variation...");
  const { productId, modelId, id } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: product._id,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Check variation id exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product model variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: id,
      type: "color",
      productModelId: modelId,
    });
    if (!variation) {
      return next(errorHandler(404, "Product model variation not found."));
    }

    // Business logic
    const updateData = req.body as ModelVariationUpdate<ModelVariationColor>;

    // Check name exists
    const updatedName = updateData.name || variation.name;
    const updatedColorHex = updateData.colorHex || variation.colorHex;
    const orConditions: ({ name: string } | { colorHex: string })[] = [];

    if (updatedName !== variation.name) {
      orConditions.push({ name: updatedName });
    }
    if (updatedColorHex !== variation.colorHex) {
      orConditions.push({ colorHex: updatedColorHex });
    }
    if (orConditions.length > 0) {
      const existingVariation = await ModelVariation.findOne({
        isDeleted: false,
        productModelId: modelId,
        type: "color",
        $or: orConditions,
      }).lean();
      if (existingVariation) {
        return next(
          errorHandler(409, "Product model variation name already exists.")
        );
      }
    }

    // Handle remove imageUrls on Firebase Storage
    if (updateData.imageUrls) {
      const imgUrlToRemove = variation.imageUrls.filter(
        (url) => !updateData.imageUrls!.includes(url)
      );
      if (imgUrlToRemove.length > 0) {
        await deleteManyFileFromFirebaseStorage(
          imgUrlToRemove,
          "product-image"
        );
      }
    }

    // Update variation
    variation.name = updatedName;
    variation.colorHex = updatedColorHex;
    variation.imageUrls = updateData.imageUrls || variation.imageUrls;
    variation.stopSelling = updateData.stopSelling ?? variation.stopSelling;
    variation.additionalPriceCents =
      updateData.additionalPriceCents ?? variation.additionalPriceCents;

    await variation.save();

    res.status(200).json({
      success: true,
      message: "Product model variation updated successfully.",
      data: formatModelVariationResponse(variation),
    } as SuccessResponse<ModelVariationResponse>);
    console.log("✅ ", "Product model variation updated successfully.");
  } catch (error) {
    next(error);
  }
}

// --- BAND VARIATION ---
export async function createBand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product model variation...");
  const { productId, modelId } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Business logic
    const {
      name,
      colorHex,
      imageUrls,
      stopSelling,
      material,
      sizeMm,
      priceCents,
      basePriceCents,
    } = req.body as ModelVariationCreate<ModelVariationBand>;

    // Check variation exists
    const existingVariation = await ModelVariation.findOne({
      isDeleted: false,
      productModelId: modelId,
      type: "band",
      $or: [{ name }, { colorHex }],
    }).lean();
    if (existingVariation) {
      return next(errorHandler(409, "Product model variation already exists."));
    }

    const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    const variation = new ModelVariation({
      productId,
      type: "band",
      name,
      colorHex,
      imageUrls,
      stopSelling,
      material,
      sizeMm,
      priceCents,
      basePriceCents,
      createBy: reqUserId,
    });
    await variation.save();

    res.status(201).json({
      success: true,
      message: "Product model variation created successfully.",
      data: formatModelVariationResponse(variation),
    } as SuccessResponse<ModelVariationResponse>);
  } catch (error) {
    next(error);
  }
}

export async function updateBand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product model variation...");
  const { productId, modelId, id } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: product._id,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Check variation id exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product model variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: id,
      type: "band",
      productModelId: modelId,
    });
    if (!variation) {
      return next(errorHandler(404, "Product model variation not found."));
    }

    // Business logic
    const updateData = req.body as ModelVariationUpdate<ModelVariationBand>;

    // Check name exists
    const updatedName = updateData.name || variation.name;
    const updatedColorHex = updateData.colorHex || variation.colorHex;
    const orConditions: ({ name: string } | { colorHex: string })[] = [];

    if (updatedName !== variation.name) {
      orConditions.push({ name: updatedName });
    }
    if (updatedColorHex !== variation.colorHex) {
      orConditions.push({ colorHex: updatedColorHex });
    }
    if (orConditions.length > 0) {
      const existingVariation = await ModelVariation.findOne({
        isDeleted: false,
        productModelId: modelId,
        type: "band",
        $or: orConditions,
      }).lean();
      if (existingVariation) {
        return next(
          errorHandler(409, "Product model variation name already exists.")
        );
      }
    }

    // Handle remove imageUrls on Firebase Storage
    if (updateData.imageUrls) {
      const imgUrlToRemove = variation.imageUrls.filter(
        (url) => !updateData.imageUrls!.includes(url)
      );
      if (imgUrlToRemove.length > 0) {
        await deleteManyFileFromFirebaseStorage(
          imgUrlToRemove,
          "product-image"
        );
      }
    }

    // Update variation
    variation.name = updatedName;
    variation.colorHex = updatedColorHex;
    variation.imageUrls = updateData.imageUrls || variation.imageUrls;
    variation.stopSelling = updateData.stopSelling ?? variation.stopSelling;
    variation.material = updateData.material || variation.material;
    variation.sizeMm = updateData.sizeMm || variation.sizeMm;
    variation.weightMg = updateData.weightMg || variation.weightMg;
    variation.priceCents = updateData.priceCents || variation.priceCents;
    variation.basePriceCents =
      updateData.basePriceCents || variation.basePriceCents;

    await variation.save();

    res.status(200).json({
      success: true,
      message: "Product model variation updated successfully.",
      data: formatModelVariationResponse(variation),
    } as SuccessResponse<ModelVariationResponse>);
    console.log("✅ ", "Product model variation updated successfully.");
  } catch (error) {
    next(error);
  }
}

// --- BOTH VARIATION ---
export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting product model variation...");
  const { productId, modelId, id } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: productId,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Check variation id exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product model variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: id,
      productModelId: modelId,
    });
    if (!variation) {
      return next(errorHandler(404, "Product model variation not found."));
    }

    res.status(200).json({
      success: true,
      message: "Product model variation retrieved successfully.",
      data: formatModelVariationResponse(variation),
    } as SuccessResponse<ModelVariationResponse>);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Removing product model variation...");
  const { productId, modelId, id } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: product._id,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Check variation id exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product model variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: id,
      productModelId: modelId,
    });
    if (!variation) {
      return next(errorHandler(404, "Product model variation not found."));
    }

    const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(variation, reqUserId);

    res.status(200).json({
      success: true,
      message: "Product model variation removed successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product model variation removed successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function executeDeletion(
  variationToDelete: any,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (variationToDelete.stockQuantity > 0) {
      // Soft delete
      variationToDelete.isDeleted = true;
      variationToDelete.deletedAt = new Date();
      variationToDelete.deletedBy = deletedBy;
      await variationToDelete.save();
      return;
    }

    // Handle remove imageUrls on Firebase Storage
    await deleteManyFileFromFirebaseStorage(
      variationToDelete.imageUrls,
      "product-image"
    );

    await variationToDelete.deleteOne();
  } catch (error) {
    throw error;
  }
}
