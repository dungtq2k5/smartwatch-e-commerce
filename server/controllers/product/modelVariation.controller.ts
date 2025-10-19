import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel from "../../models/product/productModel.model";
import {
  ModelVariationCreate,
  ModelVariationListResponse,
  ModelVariationResponse,
  ModelVariationUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import ModelVariation, {
  IModelVariation,
} from "../../models/product/modelVariation.model";
import { formatModelVariationResponse, isPresent } from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import { isEmptyObj, shallowMerge } from "../../../common/utils.common";
import Cart from "../../models/user/cart.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product model variation...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { productId, modelId } = req.params;

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found.");
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found.");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    }).lean();
    if (!model) {
      throw new HttpError(404, "Product model not found.");
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
      throw new HttpError(409, "Product model variation already exists.");
    }

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
  const { variationId } = req.params;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Product model variation not found.");
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
    }).lean();
    if (!variation) {
      throw new HttpError(404, "Product model variation not found.");
    }

    // Check model exists
    const model = await ProductModel.findById(variation.productModelId)
      .select("productId isDeleted")
      .lean();
    if (!model || model.isDeleted) {
      throw new HttpError(404, "Model of this variation not found.");
    }

    // Check product exists
    const product = await Product.findById(model.productId)
      .select("isDeleted")
      .lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product of this variation not found.");
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
      throw new HttpError(404, "Product not found.");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found.");
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found.");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: product._id,
    }).lean();
    if (!model) {
      throw new HttpError(404, "Product model not found.");
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
  const { variationId } = req.params;

  try {
    // Check variation id exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Product model variation not found.");
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
    });
    if (!variation) {
      throw new HttpError(404, "Product model variation not found.");
    }

    // Check model exists
    const model = await ProductModel.findById(variation.productModelId)
      .select("productId isDeleted")
      .lean();
    if (!model || model.isDeleted) {
      throw new HttpError(404, "Model of this variation not found.");
    }

    // Check product exists
    const product = await Product.findById(model.productId)
      .select("isDeleted")
      .lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product of this variation not found.");
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
        productModelId: variation.productModelId,
        $or: orConditions,
      }).lean();
      if (existingVariation) {
        throw new HttpError(
          409,
          "Product model variation name already exists."
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
      throw new HttpError(
        400,
        "Band adjustable range minimum cannot be greater than maximum."
      );
    }

    // Handle remove imageUrls on Firebase Storage
    const imageUrls = updateData.imageUrls;
    if (imageUrls && imageUrls.length > 0) {
      const imgUrlToRemove = variation.imageUrls.filter(
        (url) => !imageUrls.includes(url)
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
      imageUrls === null ? [] : imageUrls || variation.imageUrls;
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

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { variationId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation id exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Product model variation not found.");
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
    }).session(session);
    if (!variation) {
      throw new HttpError(404, "Product model variation not found.");
    }

    // Check model exists
    const model = await ProductModel.findById(variation.productModelId)
      .select("productId isDeleted")
      .lean();
    if (!model || model.isDeleted) {
      throw new HttpError(404, "Model of this variation not found.");
    }

    // Check product exists
    const product = await Product.findById(model.productId)
      .select("isDeleted")
      .lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product of this variation not found.");
    }

    await executeDeletion(variation, new Types.ObjectId(reqUserId), session);

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
  variationToDelete: IModelVariation,
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
      await ModelVariation.findByIdAndUpdate(
        variationToDelete._id,
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy,
        },
        { session }
      );
      return;
    }

    // Handle remove imageUrls on Firebase Storage
    await deleteManyFileFromFirebaseStorage(
      variationToDelete.imageUrls,
      "product-image"
    );

    await ModelVariation.findByIdAndDelete(variationToDelete._id, { session });
  } catch (error) {
    console.error("❌ ", "Error deleting product model variation:", error);
    throw error;
  }
}
