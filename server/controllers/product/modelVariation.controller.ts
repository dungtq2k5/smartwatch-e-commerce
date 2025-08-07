import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { errorHandler } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel from "../../models/product/productModel.model";
import {
  ModelVariationCreate,
  ModelVariationListResponse,
  ModelVariationResponse,
  ModelVariationUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import ModelVariation from "../../models/product/modelVariation.model";
import { RequestAuth } from "../../utils/types";
import { formatModelVariationResponse } from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import { isEmptyObj, shallowMerge } from "../../../common/utils.common";
import Cart from "../../models/user/cart.model";

export async function create(
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
    const product = await Product.findById(productId).lean();
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
    }).lean();
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Business logic
    const { name, color, imageUrls, additionalPriceCents, band, stopSelling } =
      req.body as ModelVariationCreate;

    // Check variation exists with unique color.hex or color.name
    const existingVariation = await ModelVariation.findOne({
      isDeleted: false,
      productModelId: modelId,
      $or: [{ "color.hex": color.hex }, { "color.name": color.name }],
    }).lean();
    if (existingVariation) {
      return next(errorHandler(409, "Product model variation already exists."));
    }

    const reqUserId = (req["auth"] as RequestAuth).userId;
    const variation = new ModelVariation({
      productModelId: modelId,
      name,
      color,
      imageUrls,
      stopSelling,
      additionalPriceCents,
      band,
      createdBy: reqUserId,
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
    const product = await Product.findById(productId).lean();
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
    }).lean();
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product model variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: id,
      productModelId: modelId,
    }).lean();
    if (!variation) {
      return next(errorHandler(404, "Product model variation not found."));
    }

    res.status(200).json({
      success: true,
      message: "Product model variation retrieved successfully.",
      data: formatModelVariationResponse(variation),
    } as SuccessResponse<ModelVariationResponse>);
    console.log("✅ ", "Product model variation retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting all product model variations...");
  const { productId, modelId } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId).lean();
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
    }).lean();
    if (!model) {
      return next(errorHandler(404, "Product model not found."));
    }

    // Fetch all variations for the model
    const variations = await ModelVariation.find({
      isDeleted: false,
      productModelId: modelId,
    }).lean();

    res.status(200).json({
      success: true,
      message: "Product model variations retrieved successfully.",
      data: {
        variations: {
          total: variations.length,
          variations: variations.map(formatModelVariationResponse),
        },
        offset: 0,
        limit: variations.length,
        total: variations.length,
      },
    } as SuccessResponse<ModelVariationListResponse>);
    console.log("✅ ", "Product model variations retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
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
    const product = await Product.findById(productId).lean();
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
    }).lean();
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

    // Business logic
    const updateData = req.body as ModelVariationUpdate;

    // Check color exists
    const updatedColor = shallowMerge(
      variation.toObject().color,
      updateData.color
    );
    const orConditions: ({ "color.hex": string } | { "color.name": string })[] =
      [];

    if (updatedColor.hex !== variation.color.hex) {
      orConditions.push({ "color.hex": updatedColor.hex });
    }
    if (updatedColor.name !== variation.color.name) {
      orConditions.push({ "color.name": updatedColor.name });
    }
    if (orConditions.length > 0) {
      const existingVariation = await ModelVariation.findOne({
        isDeleted: false,
        productModelId: modelId,
        $or: orConditions,
      }).lean();
      if (existingVariation) {
        return next(
          errorHandler(409, "Product model variation name already exists.")
        );
      }
    }

    // Check band.adjustableRange is valid since it is partial update
    const updatedBandAdjustableRange =
      updateData.band && updateData.band.adjustableRange
        ? shallowMerge(
            variation.toObject().band.adjustableRange,
            updateData.band.adjustableRange
          )
        : variation.toObject().band.adjustableRange;
    if (updatedBandAdjustableRange.minMm > updatedBandAdjustableRange.maxMm) {
      return next(
        errorHandler(
          400,
          "Band adjustable range minimum cannot be greater than maximum."
        )
      );
    }

    // Handle remove imageUrls on Firebase Storage
    if (updateData.imageUrls) {
      const imgUrlToRemove = variation.imageUrls!.filter(
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
    variation.name = updateData.name || variation.name;
    variation.color = updatedColor;
    variation.imageUrls =
      updateData.imageUrls === null
        ? []
        : updateData.imageUrls || variation.imageUrls;
    variation.additionalPriceCents =
      updateData.additionalPriceCents ?? variation.additionalPriceCents;
    if (updateData.band && !isEmptyObj(updateData.band)) {
      variation.band.widthMm =
        updateData.band.widthMm || variation.band.widthMm;
      variation.band.lugWidthMm =
        updateData.band.lugWidthMm || variation.band.lugWidthMm;
      variation.band.material =
        updateData.band.material || variation.band.material;
      if (updateData.band.colors) {
        // Since mongoose treats colors as an document array, we need to clear it first then push new colors
        variation.band.colors.splice(0, variation.band.colors.length);
        variation.band.colors.push(...updateData.band.colors);
      }
      variation.band.claspType =
        updateData.band.claspType || variation.band.claspType;
      variation.band.adjustableRange = updatedBandAdjustableRange;
      variation.band.style = updateData.band.style || variation.band.style;
      variation.band.quickRelease =
        updateData.band.quickRelease ?? variation.band.quickRelease;
      variation.band.waterResistance =
        updateData.band.waterResistance ?? variation.band.waterResistance;
      variation.band.hypoallergenic =
        updateData.band.hypoallergenic ?? variation.band.hypoallergenic;
      variation.band.weightMg =
        updateData.band.weightMg || variation.band.weightMg;
    }
    variation.stopSelling = updateData.stopSelling ?? variation.stopSelling;

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

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Removing product model variation...");
  const { productId, modelId, id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId).lean().session(session);
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
    })
      .lean()
      .session(session);
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
    }).session(session);
    if (!variation) {
      return next(errorHandler(404, "Product model variation not found."));
    }

    const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(variation, reqUserId, session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product model variation removed successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product model variation removed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
// Auto handle delete in cart
async function executeDeletion(
  variationToDelete: any,
  deletedBy: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  try {
    // Delete all data in cart that has variationId
    await Cart.deleteMany({ variationId: variationToDelete._id }, { session });
    console.log(
      "✅ ",
      `Removed cart items for variation: ${variationToDelete._id}`
    );

    if (variationToDelete.stockQuantity > 0) {
      // Soft delete
      variationToDelete.isDeleted = true;
      variationToDelete.deletedAt = new Date();
      variationToDelete.deletedBy = deletedBy;
      await variationToDelete.save({ session });
      return;
    }

    // Handle remove imageUrls on Firebase Storage
    await deleteManyFileFromFirebaseStorage(
      variationToDelete.imageUrls,
      "product-image"
    );
    await variationToDelete.deleteOne({ session });
  } catch (error) {
    throw new Error(error);
  }
}
