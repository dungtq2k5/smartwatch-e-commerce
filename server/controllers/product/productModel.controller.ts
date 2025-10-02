import { Request, Response, NextFunction } from "express";
import {
  ProductModelCreate,
  ProductModelListResponse,
  ProductModelResponse,
  ProductModelUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel, {
  IProductModel,
} from "../../models/product/productModel.model";
import ProductOs from "../../models/product/productOs.model";
import { formatProductModelResponse, isPresent } from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import ModelVariation from "../../models/product/modelVariation.model";
import {
  cleanObj,
  isEmptyObj,
  shallowMerge,
} from "../../../common/utils.common";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product model...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const productId = req.params.id;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found");
    }

    const {
      name,
      priceCents,
      stockPriceCents,
      imageUrls,
      feature,
      config,
      battery,
      screen,
      caseMaterial,
      watchWeightMg,
      compatibleBandLugWidthMm,
      releaseDate,
      stopSelling,
    } = req.body as ProductModelCreate;

    // Check if releaseDate is valid
    if (releaseDate && new Date(releaseDate) > new Date()) {
      throw new HttpError(400, "Release date cannot be in the future");
    }

    // Check if os exists
    const os = await ProductOs.findById(config.osId).lean();
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product OS not found");
    }

    // Check if model already exists
    const existingModel = await ProductModel.findOne({
      isDeleted: false,
      productId,
      name,
    }).lean();
    if (existingModel) {
      throw new HttpError(
        409,
        "Product model with model or size already exists"
      );
    }

    // Create new model
    const newModel = new ProductModel({
      productId,
      name,
      priceCents,
      stockPriceCents,
      imageUrls,
      feature,
      config,
      battery,
      screen,
      caseMaterial,
      watchWeightMg,
      compatibleBandLugWidthMm,
      releaseDate,
      stopSelling,
      createdBy: reqUserId,
    });

    await newModel.save();
    await newModel.populate("config.os");

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
      throw new HttpError(404, "Product not found");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found");
    }

    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: productId,
    })
      .populate("config.os")
      .lean();
    if (!model) {
      throw new HttpError(404, "Product model not found");
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

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting all product models...");
  const { productId } = req.params;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found");
    }

    // Fetch all models for product
    const models = await ProductModel.find({
      isDeleted: false,
      productId,
    })
      .populate("config.os")
      .lean();

    res.status(200).json({
      success: true,
      message: "Product models retrieved successfully",
      data: {
        models: {
          total: models.length,
          models: models.map(formatProductModelResponse),
        },
        offset: 0,
        limit: models.length,
        total: models.length,
      },
    } as SuccessResponse<ProductModelListResponse>);
    console.log("✅ ", "Product models retrieved successfully");
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
      throw new HttpError(404, "Product not found");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found");
    }

    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    });
    if (!model) {
      throw new HttpError(404, "Product model not found");
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
      throw new HttpError(400, "Release date cannot be in the future");
    }

    // Check if OS exists
    const updatedOsId = updateData.config?.osId
      ? new Types.ObjectId(updateData.config.osId)
      : model.config.osId;
    if (!updatedOsId.equals(model.config.osId)) {
      if (!Types.ObjectId.isValid(updatedOsId)) {
        throw new HttpError(404, "Product OS not found");
      }
      const os = await ProductOs.findById(updatedOsId);
      if (!os || os.isDeleted) {
        throw new HttpError(404, "Product OS not found");
      }
    }

    // Check if name already exists
    const updatedName = updateData.name || model.name;
    if (updatedName !== model.name) {
      const existingModel = await ProductModel.findOne({
        isDeleted: false,
        productId,
        name: updatedName,
      }).lean();
      if (existingModel) {
        throw new HttpError(409, "Product model with name already exists");
      }
    }

    // Check validation for screen
    const screenObj = model.toObject().screen;
    const updatedIsCircular =
      updateData.screen?.isCircular ?? model.screen.isCircular;
    const updatedDiameterMm =
      updateData.screen?.diameterMm === null
        ? null
        : updateData.screen?.diameterMm || model.screen.diameterMm;
    const updatedDimension =
      updateData.screen?.dimension === null
        ? null
        : screenObj.dimension
        ? shallowMerge(screenObj.dimension, updateData.screen?.dimension)
        : updateData.screen?.dimension &&
          updateData.screen.dimension.hMm &&
          updateData.screen.dimension.wMm &&
          updateData.screen.dimension.thicknessMm
        ? (updateData.screen.dimension as {
            wMm: number;
            hMm: number;
            thicknessMm: number;
          })
        : null;

    if (updatedIsCircular && !updatedDiameterMm) {
      throw new HttpError(400, "Diameter is required for circular screens");
    }
    if (!updatedIsCircular && !updatedDimension) {
      throw new HttpError(
        400,
        "Dimension is required for non-circular screens"
      );
    }

    // Update imageUrls on Firebase Storage
    const imageUrls = updateData.imageUrls;
    if (imageUrls && imageUrls.length > 0) {
      const imgUrlToRemove = model.imageUrls.filter(
        (url) => !imageUrls.includes(url)
      );
      if (imgUrlToRemove.length > 0) {
        await deleteManyFileFromFirebaseStorage(
          imgUrlToRemove,
          "product-image"
        );
      }
    }

    model.name = updateData.name || model.name;
    model.priceCents = updateData.priceCents ?? model.priceCents;
    model.stockPriceCents = updateData.stockPriceCents ?? model.stockPriceCents;
    model.imageUrls = imageUrls === null ? [] : imageUrls || model.imageUrls;
    if (updateData.feature) {
      const featureObj = model.toObject().feature;

      model.feature.speakerAndMicrophone =
        updateData.feature.speakerAndMicrophone ??
        featureObj.speakerAndMicrophone;
      model.feature.waterResistance =
        updateData.feature.waterResistance === null
          ? null
          : featureObj.waterResistance
          ? shallowMerge(
              featureObj.waterResistance,
              updateData.feature.waterResistance
            )
          : updateData.feature.waterResistance?.rating
          ? {
              rating: updateData.feature.waterResistance.rating,
              description:
                updateData.feature.waterResistance.description || null,
            }
          : null;
      model.feature.utilities =
        updateData.feature.utilities === null
          ? null
          : featureObj.utilities
          ? shallowMerge(
              featureObj.utilities,
              updateData.feature.utilities as any
            )
          : !updateData.feature.utilities
          ? null
          : Object.keys(cleanObj(updateData.feature.utilities)).length // Handle empty obj {}
          ? (updateData.feature.utilities as any)
          : null;
      model.feature.supportedAppsForNotifications =
        updateData.feature.supportedAppsForNotifications === null
          ? []
          : updateData.feature.supportedAppsForNotifications ||
            featureObj.supportedAppsForNotifications;
    }
    if (updateData.config && !isEmptyObj(updateData.config)) {
      const configObj = model.toObject().config;

      model.config.connectivities =
        updateData.config.connectivities === null
          ? []
          : configObj.connectivities || updateData.config.connectivities;
      model.config.camera =
        updateData.config.camera === null
          ? null
          : configObj.camera
          ? shallowMerge(configObj.camera, updateData.config.camera as any)
          : updateData.config.camera && updateData.config.camera.resolutionMp
          ? (updateData.config.camera as any)
          : null;
      model.config.chipset = updateData.config.chipset || configObj.chipset;
      model.config.memory = shallowMerge(
        configObj.memory,
        updateData.config.memory
      );
      model.config.osId = updatedOsId;
      model.config.compatiblePhoneOs =
        updateData.config.compatiblePhoneOs === null
          ? []
          : updateData.config.compatiblePhoneOs || configObj.compatiblePhoneOs;
      model.config.appsConnect =
        updateData.config.appsConnect === null
          ? []
          : updateData.config.appsConnect || configObj.appsConnect;
      model.config.sensors =
        updateData.config.sensors === null
          ? []
          : updateData.config.sensors || configObj.sensors;
    }
    if (updateData.battery && !isEmptyObj(updateData.battery)) {
      const batteryObj = model.toObject().battery;

      model.battery.capacityMah =
        updateData.battery.capacityMah || batteryObj.capacityMah;
      model.battery.timeOnline = shallowMerge(
        model.battery.timeOnline,
        updateData.battery.timeOnline
      );
      model.battery.timeFullChargeMin =
        updateData.battery.timeFullChargeMin || batteryObj.timeFullChargeMin;
      model.battery.chargingType =
        updateData.battery.chargingType || batteryObj.chargingType;
    }
    if (updateData.screen && !isEmptyObj(updateData.screen)) {
      model.screen.display = shallowMerge(
        model.screen.display,
        updateData.screen.display
      );
      model.screen.brightness = shallowMerge(
        model.screen.brightness,
        updateData.screen.brightness
      );
      model.screen.resolution = shallowMerge(
        model.screen.resolution,
        updateData.screen.resolution
      );
      model.screen.glassMaterial =
        updateData.screen.glassMaterial || model.screen.glassMaterial;
      model.screen.bezelMaterial =
        updateData.screen.bezelMaterial || model.screen.bezelMaterial;
      model.screen.isCircular = updatedIsCircular;
      model.screen.diameterMm = updatedIsCircular ? updatedDiameterMm : null;
      model.screen.dimension = !updatedIsCircular ? updatedDimension : null;
      model.screen.shape = updateData.screen.shape || model.screen.shape;
    }
    model.caseMaterial = updateData.caseMaterial || model.caseMaterial;
    model.watchWeightMg = updateData.watchWeightMg || model.watchWeightMg;
    model.compatibleBandLugWidthMm =
      updateData.compatibleBandLugWidthMm || model.compatibleBandLugWidthMm;
    model.releaseDate = updatedReleaseDate;
    model.stopSelling = updateData.stopSelling ?? model.stopSelling;

    await model.save();
    await model.populate("config.os");

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

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { productId, id: modelId } = req.params;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found");
    }

    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId: productId,
    });
    if (!model) {
      throw new HttpError(404, "Product model not found");
    }

    await executeDeletion(model, new Types.ObjectId(reqUserId));

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
    console.error("❌ ", "Error checking model constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  modelToDelete: IProductModel,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(modelToDelete._id)) {
      // Soft delete
      await ProductModel.findByIdAndUpdate(modelToDelete._id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      });
      return;
    }

    // Handle remove imageUrls on Firebase Storage
    await deleteManyFileFromFirebaseStorage(
      modelToDelete.imageUrls,
      "product-image"
    );

    await ProductModel.findByIdAndDelete(modelToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting product model:", error);
    throw error;
  }
}
