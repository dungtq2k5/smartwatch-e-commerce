import { Request, Response, NextFunction } from "express";
import {
  ProductModelCreate,
  ProductModelResponse,
  ProductModelUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { Types } from "mongoose";
import { errorHandler } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel from "../../models/product/productModel.model";
import ProductOs from "../../models/product/productOs.model";
import { RequestAuth } from "../../utils/types";
import { formatProductModelResponse } from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import ModelVariation from "../../models/product/modelVariation.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product model...");
  const productId = req.params.id;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found"));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found"));
    }

    const {
      model,
      name,
      watchSizeMm,
      priceCents,
      stockPriceCents,
      imageUrls,
      display,
      resolution,
      memory,
      osId,
      chipset,
      connectivities,
      batteryLifeMah,
      waterResistance,
      sensors,
      caseMaterial,
      weightMg,
      compatibleBandLugWidthMm,
      releaseDate,
      stopSelling,
    } = req.body as ProductModelCreate;

    // Check if releaseDate is valid
    if (releaseDate && new Date(releaseDate) > new Date()) {
      return next(errorHandler(400, "Release date cannot be in the future"));
    }

    // Check if os exists
    const os = await ProductOs.findById(osId);
    if (!os || os.isDeleted) {
      return next(errorHandler(404, "Product OS not found"));
    }

    // Check if model already exists
    const existingModel = await ProductModel.findOne({
      isDeleted: false,
      productId,
      $or: [{ model }, { watchSizeMm }],
    }).lean();
    if (existingModel) {
      return next(
        errorHandler(409, "Product model with model or size already exists")
      );
    }

    // Create new model
    const reqUserId = (req["auth"] as RequestAuth).userId;
    const newModel = new ProductModel({
      productId,
      model,
      name,
      watchSizeMm,
      priceCents,
      stockPriceCents,
      imageUrls,
      display,
      resolution,
      memory,
      osId,
      chipset,
      connectivities,
      batteryLifeMah,
      waterResistance,
      sensors,
      caseMaterial,
      weightMg,
      compatibleBandLugWidthMm,
      releaseDate,
      stopSelling,
      createdBy: reqUserId,
    });

    await newModel.save();

    res.status(201).json({
      success: true,
      message: "Product model created successfully",
      data: formatProductModelResponse(newModel),
    } as SuccessResponse<ProductModelResponse>);
    console.log("✅ ", "Product model created successfully");
  } catch (error) {
    next(error);
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting product model...");
  const { productId, id: modelId } = req.params;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found"));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found"));
    }

    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found"));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: productId,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found"));
    }

    res.status(200).json({
      success: true,
      message: "Product model retrieved successfully",
      data: formatProductModelResponse(model),
    } as SuccessResponse<ProductModelResponse>);
    console.log("✅ ", "Product model retrieved successfully");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product model...");
  const { productId, id: modelId } = req.params;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found"));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found"));
    }

    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found"));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found"));
    }

    // Business logic
    const updateData = req.body as ProductModelUpdate;

    // Valid releaseDate
    const updatedReleaseDate = updateData.releaseDate
      ? new Date(updateData.releaseDate)
      : model.releaseDate;
    if (
      updatedReleaseDate !== model.releaseDate &&
      updatedReleaseDate > new Date()
    ) {
      return next(errorHandler(400, "Release date cannot be in the future"));
    }

    // Check if OS exists and update
    const updatedOsId = updateData.osId
      ? new Types.ObjectId(updateData.osId)
      : model.osId;
    if (!updatedOsId.equals(model.osId)) {
      if (!Types.ObjectId.isValid(updatedOsId)) {
        return next(errorHandler(404, "Product OS not found"));
      }
      const os = await ProductOs.findById(updatedOsId);
      if (!os || os.isDeleted) {
        return next(errorHandler(404, "Product OS not found"));
      }
    }

    // Check if model with same name and size already exists and update
    const updatedModel = updateData.model || model["model"];
    const updatedSizeMm = updateData.watchSizeMm || model.watchSizeMm;

    const orConditions: ({ model: string } | { watchSizeMm: number })[] = [];
    if (updatedModel !== model["model"]) {
      orConditions.push({ model: updatedModel });
    }
    if (updatedSizeMm !== model.watchSizeMm) {
      orConditions.push({ watchSizeMm: updatedSizeMm });
    }
    if (orConditions.length > 0) {
      const existingModel = await ProductModel.findOne({
        isDeleted: false,
        productId,
        $or: orConditions,
      }).lean();
      if (existingModel) {
        return next(
          errorHandler(409, "Product model with model or size already exists")
        );
      }
    }

    // Update imageUrls on Firebase Storage
    if (updateData.imageUrls) {
      const imgUrlToRemove = model.imageUrls.filter(
        (url) => !updateData.imageUrls!.includes(url)
      );
      if (imgUrlToRemove.length > 0) {
        await deleteManyFileFromFirebaseStorage(
          imgUrlToRemove,
          "product-image"
        );
      }
    }

    (model as any).model = updatedModel;
    model.name = updateData.name || model.name;
    model.watchSizeMm = updatedSizeMm;
    model.priceCents = updateData.priceCents ?? model.priceCents;
    model.stockPriceCents = updateData.stockPriceCents ?? model.stockPriceCents;
    model.imageUrls = updateData.imageUrls || model.imageUrls;
    (model.display as any) = updateData.display
      ? { ...model.toObject().display, ...updateData.display }
      : model.display;
    model.resolution = updateData.resolution
      ? { ...model.toObject().resolution, ...updateData.resolution }
      : model.resolution;
    model.memory = updateData.memory
      ? { ...model.toObject().memory, ...updateData.memory }
      : model.memory;
    model.osId = updatedOsId;
    model.chipset = updateData.chipset || model.chipset;
    model.connectivities = updateData.connectivities || model.connectivities;
    model.batteryLifeMah = updateData.batteryLifeMah || model.batteryLifeMah;
    model.waterResistance = updateData.waterResistance || model.waterResistance;
    model.sensors = updateData.sensors || model.sensors;
    model.caseMaterial = updateData.caseMaterial || model.caseMaterial;
    model.weightMg = updateData.weightMg || model.weightMg;
    model.compatibleBandLugWidthMm =
      updateData.compatibleBandLugWidthMm || model.compatibleBandLugWidthMm;
    model.releaseDate = updatedReleaseDate;
    model.stopSelling = updateData.stopSelling ?? model.stopSelling;

    await model.save();

    res.status(200).json({
      success: true,
      message: "Product model updated successfully",
      data: formatProductModelResponse(model),
    } as SuccessResponse<ProductModelResponse>);
    console.log("✅ ", "Product model updated successfully");
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Removing product model...");
  const { productId, id: modelId } = req.params;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found"));
    }
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found"));
    }

    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Product model not found"));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: productId,
    });
    if (!model) {
      return next(errorHandler(404, "Product model not found"));
    }

    const reqUserId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(model, reqUserId);

    res.status(200).json({
      success: true,
      message: "Product model removed successfully",
    } as SuccessResponse<null>);
    console.log("✅ ", "Product model removed successfully");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(modelId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking model constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - ModelVariation (productModelId)
    */
    const constraintChecks = [
      ModelVariation.exists({ productModelId: modelId }),
    ];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for model: ${modelId}. Soft delete required.`
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for model: ${modelId}. Hard delete allowed.`
      );
    }
    return hasConstraints;
  } catch (error) {
    throw new Error(error);
  }
}

async function executeDeletion(
  modelToDelete: any,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(modelToDelete._id)) {
      // Soft delete
      modelToDelete.isDeleted = true;
      modelToDelete.deletedAt = new Date();
      modelToDelete.deletedBy = deletedBy;
      await modelToDelete.save();
      return;
    }

    // Handle remove imageUrls on Firebase Storage
    await deleteManyFileFromFirebaseStorage(
      modelToDelete.imageUrls,
      "product-image"
    );

    await modelToDelete.deleteOne();
  } catch (error) {
    throw new Error(error);
  }
}
