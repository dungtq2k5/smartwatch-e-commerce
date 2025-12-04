import { Request, Response, NextFunction } from "express";
import {
  ProductModelCreate,
  ProductModelListResponse,
  ProductModelSearchQuery,
  ProductModelResponse,
  ProductModelUpdate,
  SuccessResponse,
  AdminProductModelListResponse,
  ProductModelDetailQuery,
  AdminProductModelResponseForList,
  AdminProductModelDetailResponse,
  AdminModelVariationResponse,
  ProductModelBulkDelete,
} from "../../../common/types.common";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel, {
  IProductModel,
} from "../../models/product/productModel.model";
import ProductOs from "../../models/product/productOs.model";
import {
  formatAdminModelVariationResponse,
  formatAdminProductModelResponse,
  formatAdminProductModelResponseForList,
  formatProductModelResponse,
  isPresent,
} from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import ModelVariation from "../../models/product/modelVariation.model";
import {
  cleanObj,
  isEmptyObj,
  shallowMerge,
} from "../../../common/utils.common";
import Cart from "../../models/user/cart.model";
import {
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_PRODUCT_MODELS_TO_DELETE_BULK } from "../../../common/configs.common";

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

  const {
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
  } = req.body as ProductModelCreate;

  try {
    // Check if product exists
    if (!Types.ObjectId.isValid(productId)) {
      throw new HttpError(404, "Product not found");
    }
    const product = await Product.findById(productId).lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product not found");
    }

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
  const { modelId } = req.params;

  try {
    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
    })
      .populate("config.os")
      .lean();
    if (!model) {
      throw new HttpError(404, "Product model not found");
    }

    // Check if product exists
    const product = await Product.findById(model.productId)
      .select("isDeleted")
      .lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product of this model not found.");
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

export async function adminGetDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting product model details for admin...");

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

  const { modelId } = req.params;
  const reqQuery = req["sanitizedQuery"] as ProductModelDetailQuery;

  const variationQueryMatch: any = { isDeleted: false };
  if (reqQuery.variationStopSelling) {
    variationQueryMatch.stopSelling = reqQuery.variationStopSelling === "true";
  }

  try {
    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }

    const modelDetails = await ProductModel.aggregate([
      {
        $match: {
          isDeleted: false,
          _id: new Types.ObjectId(modelId),
        },
      },
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
          from: "productos",
          localField: "config.osId",
          foreignField: "_id",
          as: "config.os",
          pipeline: [OPTIMIZE_PIPELINE],
        },
      },
      { $unwind: "$config.os" },
      {
        $project: { "config.osId": 0 },
      },
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
    ]);

    if (modelDetails.length === 0) {
      throw new HttpError(404, "Product model not found");
    }

    const modelDetail = modelDetails[0];

    const formattedModelVariations: AdminModelVariationResponse[] =
      modelDetail.variations.map(formatAdminModelVariationResponse);
    const { totalVariations, ...restModelDetail } =
      formatAdminProductModelResponse(modelDetail);

    res.status(200).json({
      success: true,
      message: "Product model details retrieved successfully",
      data: {
        ...restModelDetail,
        variations: {
          total: formattedModelVariations.length,
          variations: formattedModelVariations,
        },
      },
    } as SuccessResponse<AdminProductModelDetailResponse>);
  } catch (error) {
    next(error);
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Searching product models...");

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

  const reqQuery = req["sanitizedQuery"] as ProductModelSearchQuery;

  const limit = reqQuery.limit ? Number.parseInt(reqQuery.limit, 10) : 9;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  if (reqQuery.searchTerm) {
    query.$or = [
      {
        _id: Types.ObjectId.isValid(reqQuery.searchTerm)
          ? new Types.ObjectId(reqQuery.searchTerm)
          : undefined,
      },
      {
        productId: Types.ObjectId.isValid(reqQuery.searchTerm)
          ? new Types.ObjectId(reqQuery.searchTerm)
          : undefined,
      },
      { name: { $regex: reqQuery.searchTerm, $options: "i" } },
    ];
  }

  if (reqQuery.priceCentsMin) {
    query.priceCents = {
      $gte: Number.parseInt(reqQuery.priceCentsMin, 10),
    };
  }
  if (reqQuery.priceCentsMax) {
    query.priceCents = {
      ...query.priceCents,
      $lte: Number.parseInt(reqQuery.priceCentsMax, 10),
    };
  }

  if (reqQuery.stockPriceCentsMin) {
    query.stockPriceCents = {
      $gte: Number.parseInt(reqQuery.stockPriceCentsMin, 10),
    };
  }
  if (reqQuery.stockPriceCentsMax) {
    query.stockPriceCents = {
      ...query.stockPriceCents,
      $lte: Number.parseInt(reqQuery.stockPriceCentsMax, 10),
    };
  }

  if (reqQuery.releaseDateFrom) {
    query.releaseDate = {
      $gte: new Date(reqQuery.releaseDateFrom),
    };
  }
  if (reqQuery.releaseDateTo) {
    query.releaseDate = {
      ...query.releaseDate,
      $lte: new Date(reqQuery.releaseDateTo),
    };
  }

  if (reqQuery.stopSelling !== undefined) {
    query.stopSelling = reqQuery.stopSelling === "true";
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await ProductModel.aggregate([
      { $match: { isDeleted: false, ...query } },
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
          pipeline: [{ $match: { isDeleted: false } }],
        },
      },
      {
        $addFields: {
          totalVariations: { $size: "$variations" },
        },
      },
      {
        $project: { variations: 0 },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const models: AdminProductModelResponseForList[] =
      aggregationResult[0].data.map(formatAdminProductModelResponseForList);
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Product models retrieved successfully",
      data: {
        total,
        models: {
          total: models.length,
          models,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminProductModelListResponse>);
    console.log("✅ ", "Product models retrieved successfully");
  } catch (error) {
    next(error);
  }
}

export async function getAllByProductId(
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
  const { modelId } = req.params;

  try {
    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
    });
    if (!model) {
      throw new HttpError(404, "Product model not found");
    }

    // Check if product exists
    const product = await Product.findById(model.productId)
      .select("isDeleted")
      .lean();
    if (!product || product.isDeleted) {
      throw new HttpError(404, "Product of this model not found.");
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
        productId: model.productId,
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
      model.screen.refreshRateHz =
        updateData.screen.refreshRateHz ?? model.screen.refreshRateHz;
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

  const { modelId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
    }).session(session);
    if (!model) {
      throw new HttpError(404, "Product model not found");
    }

    await executeDeletion(model, new Types.ObjectId(reqUserId), session);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product model removed successfully",
    } as SuccessResponse<null>);
    console.log("✅ ", "Product model removed successfully");
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
  console.log("▶️ ", "Removing multiple product models...");

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

  const { modelIds: modelIdsToDelete } = req.body as ProductModelBulkDelete;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (modelIdsToDelete.length > MAX_PRODUCT_MODELS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_PRODUCT_MODELS_TO_DELETE_BULK} product models at once.`
      );
    }

    // Delete models, if models not found -> skip and continue
    for (const modelId of modelIdsToDelete) {
      const model = Types.ObjectId.isValid(modelId)
        ? await ProductModel.findById(modelId).session(session)
        : null;
      if (model && !model.isDeleted) {
        await executeDeletion(model, new Types.ObjectId(reqUserId), session);
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Product models removed successfully",
    } as SuccessResponse<null>);
    console.log("✅ ", "Product models removed successfully");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(modelId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking model constraints...");

  try {
    /*
      None-blocking constraints: productModel -> modelVariation -> (in users' carts)
      Blocking constraints: productModel -> modelVariation (stockQuantity > 0)
    */

    const hasStock = await ModelVariation.exists({
      productModelId: modelId,
      stockQuantity: { $gt: 0 },
    });

    if (hasStock) {
      console.log(
        `▶️ `,
        `Critical constraints found for model: ${modelId}. Soft delete required.`
      );
      return true;
    }

    console.log(
      `✅ `,
      `No critical constraints found for model: ${modelId}. Hard delete allowed.`
    );
    return false;
  } catch (error) {
    console.error("❌ ", "Error checking model constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  modelToDelete: IProductModel,
  deletedBy: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  try {
    /*
      Business logic:
        - Check root constrains (stockQuantity in modelVariation) before make hard or soft delete.
        - Hard delete: delete related variations (also in user's cart) -> delete model -> delete images from Firebase Storage.
        - Soft delete: soft delete related variations -> soft delete model.
    */

    const modelId = modelToDelete._id;
    const variations = await ModelVariation.find({
      productModelId: modelToDelete._id,
    })
      .session(session)
      .lean();
    const variationIds = variations.map((variation) => variation._id);

    if (await hasConstraints(modelId)) {
      // -- Soft delete
      console.log(`▶️ `, `Soft deleting model ${modelId} and its children...`);

      const softDeleteUpdate = {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      };

      // Soft delete variations
      if (variationIds.length > 0) {
        await ModelVariation.updateMany(
          { _id: { $in: variationIds } },
          softDeleteUpdate
        ).session(session);
      }

      // Soft delete model
      await ProductModel.findByIdAndUpdate(modelId, softDeleteUpdate).session(
        session
      );
      return;
    }

    // -- Hard delete
    console.log(`▶️ `, `Hard deleting model ${modelId} and its children...`);

    // Delete variations and carts
    if (variationIds.length > 0) {
      await Cart.deleteMany({ variationId: { $in: variationIds } }).session(
        session
      );
      await ModelVariation.deleteMany({ _id: { $in: variationIds } }).session(
        session
      );
    }

    // Delete model
    await ProductModel.findByIdAndDelete(modelId).session(session);

    // Delete images from Firebase Storage
    const imgUrls = modelToDelete.imageUrls;
    for (const variation of variations) imgUrls.push(...variation.imageUrls);

    if (imgUrls.length > 0) {
      await deleteManyFileFromFirebaseStorage(imgUrls, "product-image");
    }
  } catch (error) {
    console.error("❌ ", "Error deleting product model:", error);
    throw error;
  }
}
