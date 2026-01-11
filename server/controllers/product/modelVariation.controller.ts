import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel from "../../models/product/productModel.model";
import {
  AdminModelVariationListResponse,
  AdminModelVariationResponse,
  ModelVariationBulkDelete,
  ModelVariationCreate,
  ModelVariationListResponse,
  ModelVariationResponse,
  ModelVariationSearchQuery,
  ModelVariationUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import ModelVariation, {
  IModelVariation,
} from "../../models/product/modelVariation.model";
import {
  formatAdminModelVariationResponse,
  formatModelVariationResponse,
  isPresent,
} from "../../utils/utils";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import { isEmptyObj, shallowMerge } from "../../../common/utils.common";
import Cart from "../../models/user/cart.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_MODEL_VARIATIONS_TO_DELETE_BULK } from "../../../common/configs.common";

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

  const {
    productModelId: modelId,
    name,
    color,
    imageUrls,
    additionalPriceCents,
    stockAdditionalPriceCents,
    band,
    stopSelling,
  } = req.body as ModelVariationCreate;

  try {
    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      throw new HttpError(404, "Product model not found.");
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
    }).lean();
    if (!model) {
      throw new HttpError(404, "Product model not found.");
    }

    // Business logic

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
      stockAdditionalPriceCents,
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

export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin getting product model variation...");

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

  const { variationId } = req.params;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Product model variation not found.");
    }
    const variation = await ModelVariation.aggregate([
      { $match: { isDeleted: false, _id: new Types.ObjectId(variationId) } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "productmodels",
          localField: "productModelId",
          foreignField: "_id",
          as: "productModel",
          pipeline: [{ $project: { productId: 1 } }],
        },
      },
      { $unwind: "$productModel" },
      {
        $addFields: {
          productId: "$productModel.productId",
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
    ]).then((results) => results[0]);

    if (!variation) {
      throw new HttpError(404, "Product model variation not found.");
    }

    res.status(200).json({
      success: true,
      message: "Product model variation retrieved successfully.",
      data: formatAdminModelVariationResponse(variation),
    } as SuccessResponse<AdminModelVariationResponse>);
    console.log("✅ ", "Product model variation retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin searching product model variations...");

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

  const reqQuery = req["sanitizedQuery"] as ModelVariationSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  if (reqQuery.searchTerm) {
    const isValidObjId = Types.ObjectId.isValid(reqQuery.searchTerm);

    // If searchTerm is a valid ObjectId -> find all models belong to the productId
    let modelIdsFromProduct: Types.ObjectId[] = [];
    if (isValidObjId) {
      const models = await ProductModel.find({
        isDeleted: false,
        productId: new Types.ObjectId(reqQuery.searchTerm),
      })
        .select("_id")
        .lean();

      modelIdsFromProduct = models.map((m) => m._id);
    }

    query.$or = [
      {
        _id: isValidObjId ? new Types.ObjectId(reqQuery.searchTerm) : undefined,
      },
      {
        productModelId: isValidObjId
          ? new Types.ObjectId(reqQuery.searchTerm)
          : undefined,
      },
      { productModelId: { $in: modelIdsFromProduct } },
      { name: { $regex: reqQuery.searchTerm, $options: "i" } },
      { "color.name": { $regex: reqQuery.searchTerm, $options: "i" } },
      { "color.hex": { $regex: reqQuery.searchTerm, $options: "i" } },
    ];
  }

  if (reqQuery.additionalPriceCentsMin) {
    query.additionalPriceCents = {
      $gte: Number.parseInt(reqQuery.additionalPriceCentsMin, 10),
    };
  }
  if (reqQuery.additionalPriceCentsMax) {
    query.additionalPriceCents = {
      ...query.priceCents,
      $lte: Number.parseInt(reqQuery.additionalPriceCentsMax, 10),
    };
  }

  if (reqQuery.stockAdditionalPriceCentsMin) {
    query.stockAdditionalPriceCents = {
      $gte: Number.parseInt(reqQuery.stockAdditionalPriceCentsMin, 10),
    };
  }
  if (reqQuery.stockAdditionalPriceCentsMax) {
    query.stockAdditionalPriceCents = {
      ...query.stockPriceCents,
      $lte: Number.parseInt(reqQuery.stockAdditionalPriceCentsMax, 10),
    };
  }

  if (reqQuery.stopSelling) {
    query.stopSelling = reqQuery.stopSelling === "true";
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await ModelVariation.aggregate([
      { $match: { isDeleted: false, ...query } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "productmodels",
          localField: "productModelId",
          foreignField: "_id",
          as: "productModel",
          pipeline: [{ $project: { productId: 1 } }],
        },
      },
      { $unwind: "$productModel" },
      {
        $addFields: {
          productId: "$productModel.productId",
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
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const variations: AdminModelVariationResponse[] =
      aggregationResult[0].data.map(formatAdminModelVariationResponse);
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Product model variations retrieved successfully.",
      data: {
        total,
        variations: {
          total: variations.length,
          variations,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminModelVariationListResponse>);
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
    variation.stockAdditionalPriceCents =
      updateData.stockAdditionalPriceCents ??
      variation.stockAdditionalPriceCents;
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

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Removing multiple model variations...");

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

  const { variationIds: variationIdsToDelete } =
    req.body as ModelVariationBulkDelete;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (variationIdsToDelete.length > MAX_MODEL_VARIATIONS_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_MODEL_VARIATIONS_TO_DELETE_BULK} model variations at once.`
      );
    }

    // Delete variations, if variations not found -> skip and continue
    for (const variationId of variationIdsToDelete) {
      const variation = Types.ObjectId.isValid(variationId)
        ? await ModelVariation.findById(variationId).session(session)
        : null;
      if (variation && !variation.isDeleted) {
        await executeDeletion(
          variation,
          new Types.ObjectId(reqUserId),
          session
        );
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Model variations removed successfully",
    } as SuccessResponse<null>);
    console.log("✅ ", "Model variations removed successfully");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
async function executeDeletion(
  variationToDelete: IModelVariation,
  deletedBy: Types.ObjectId,
  session: mongoose.ClientSession
): Promise<void> {
  try {
    /*
      Business logic:
        - Hard delete (stockQuantity = 0): delete users' carts -> delete variation -> delete imgUrls.
        - Soft delete (stockQuantity > 0): soft delete variation.
    */

    const variationId = variationToDelete._id;

    if (variationToDelete.stockQuantity > 0) {
      // -- Soft delete
      console.log(`▶️ `, `Soft deleting variation ${variationId}...`);

      await ModelVariation.findByIdAndUpdate(variationId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      }).session(session);
      return;
    }

    // -- Hard delete
    console.log(`▶️ `, `Hard deleting variation ${variationId}...`);

    // Delete variation and carts
    await Cart.deleteMany({ variationId }).session(session);
    await ModelVariation.findByIdAndDelete(variationId).session(session);

    // Delete imageUrls from Firebase Storage
    if (variationToDelete.imageUrls.length > 0) {
      await deleteManyFileFromFirebaseStorage(
        variationToDelete.imageUrls,
        "product-image"
      );
    }
  } catch (error) {
    console.error("❌ ", "Error deleting product model variation:", error);
    throw error;
  }
}
