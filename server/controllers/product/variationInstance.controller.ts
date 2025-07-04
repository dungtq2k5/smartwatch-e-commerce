import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { errorHandler } from "../../utils/errorHandler";
import Product from "../../models/product/product.model";
import ProductModel from "../../models/product/productModel.model";
import ModelVariation from "../../models/product/modelVariation.model";
import VariationInstance from "../../models/product/variationInstance.model";
import type {
  SuccessResponse,
  VariationInstanceCreate,
  VariationInstanceResponse,
  VariationInstanceUpdate,
} from "../../../common/types.common";
import {
  formatVariationInstanceResponse,
  genInstanceSku,
} from "../../utils/utils";
import { appCache } from "../../configs/cache";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import type { RequestAuth } from "../../utils/types";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating variation instance...");
  const { productId, modelId, variationId } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check product exists
    if (!Types.ObjectId.isValid(productId)) {
      return next(errorHandler(404, "Product not found."));
    }
    const product = await Product.findById(productId).session(session);
    if (!product || product.isDeleted) {
      return next(errorHandler(404, "Product not found."));
    }

    // Check model exists
    if (!Types.ObjectId.isValid(modelId)) {
      return next(errorHandler(404, "Model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    }).session(session);
    if (!model) {
      return next(errorHandler(404, "Model not found."));
    }

    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
      productModelId: modelId,
    }).session(session);
    if (!variation) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Business logic
    const { supplierSerialNumber, supplierImeiNumber, conditionId, isActive } =
      req.body as VariationInstanceCreate;
    if (supplierImeiNumber && variation.type === "band") {
      return next(errorHandler(400, "Band variation cannot have IMEI number."));
    }

    // Check supplier serial number is unique
    const orConditions: (
      | { supplierSerialNumber: string }
      | { supplierImeiNumber: string }
    )[] = [{ supplierSerialNumber }];
    if (supplierImeiNumber) orConditions.push({ supplierImeiNumber });
    const existingInstance = await VariationInstance.findOne({
      modelVariationId: variationId,
      $or: orConditions,
    }).lean().session(session);
    if (existingInstance) {
      return next(errorHandler(409, "Variation instance already exists."));
    }

    // Check condition exists
    if (conditionId) {
      if (!Types.ObjectId.isValid(conditionId)) {
        return next(errorHandler(404, "Condition not found."));
      }

      const conditionIdList = Object.values(appCache.instanceConditions || {});
      if (!conditionIdList.includes(new Types.ObjectId(conditionId))) {
        return next(errorHandler(404, "Condition not found."));
      }
    }

    // Create variation instance
    const sku = await genInstanceSku(variation._id);
    const instance = new VariationInstance({
      sku,
      modelVariationId: variationId,
      supplierSerialNumber,
      supplierImeiNumber,
      conditionId: conditionId || getConditionId("new"),
      isActive,
      inactiveAt: isActive ? undefined : new Date(),
    });

    await instance.save({ session });

    // Create inventory movement
    const reqUserId = (req["auth"] as RequestAuth).userId;
    const inventoryMovement = new InventoryMovement({
      sku,
      movementTypeId: getMovementTypeId("stock adjustment"),
      createBy: reqUserId,
      quantity: 1,
      notes: "Manual creation instance",
    });

    await inventoryMovement.save({ session });

    // Increase stock
    variation.stockQuantity += 1;
    await variation.save({ session });

    // Commit transaction
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Variation instance created successfully.",
      data: formatVariationInstanceResponse(instance),
    } as SuccessResponse<VariationInstanceResponse>);
    console.log("✅ Variation instance created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching variation instance...");
  const { productId, modelId, variationId, id } = req.params;

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
      return next(errorHandler(404, "Model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    });
    if (!model) {
      return next(errorHandler(404, "Model not found."));
    }

    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
      productModelId: modelId,
    });
    if (!variation) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Check instance exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Variation instance not found."));
    }
    const instance = await VariationInstance.findOne({
      isDeleted: false,
      _id: id,
      modelVariationId: variationId,
    });
    if (!instance) {
      return next(errorHandler(404, "Variation instance not found."));
    }

    res.status(200).json({
      success: true,
      message: "Variation instance fetched successfully.",
      data: formatVariationInstanceResponse(instance),
    } as SuccessResponse<VariationInstanceResponse>);
    console.log("✅ Variation instance fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating variation instance...");
  const { productId, modelId, variationId, id } = req.params;

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
      return next(errorHandler(404, "Model not found."));
    }
    const model = await ProductModel.findOne({
      isDeleted: false,
      _id: modelId,
      productId,
    });
    if (!model) {
      return next(errorHandler(404, "Model not found."));
    }

    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
      productModelId: modelId,
    });
    if (!variation) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Check instance exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Variation instance not found."));
    }
    const instance = await VariationInstance.findOne({
      isDeleted: false,
      _id: id,
      modelVariationId: variationId,
    });
    if (!instance) {
      return next(errorHandler(404, "Variation instance not found."));
    }

    // Business logic
    const { supplierSerialNumber, supplierImeiNumber, conditionId, isActive } =
      req.body as VariationInstanceUpdate;
    // Check conditionId exists
    const updatedConditionId = conditionId
      ? new Types.ObjectId(conditionId)
      : instance.conditionId;
    if (!updatedConditionId.equals(instance.conditionId)) {
      if (!Types.ObjectId.isValid(updatedConditionId)) {
        return next(errorHandler(404, "Condition not found."));
      }

      const conditionIdList = Object.values(appCache.instanceConditions || {});
      if (!conditionIdList.includes(updatedConditionId)) {
        return next(errorHandler(404, "Condition not found."));
      }
    }

    // If variation type = band and supplierImeiNumber is provided, return error
    if (supplierImeiNumber && variation.type === "band") {
      return next(errorHandler(400, "Band variation cannot have IMEI number."));
    }

    // Check existing supplier serial and imei
    const updatedSupplierSerialNumber =
      supplierSerialNumber || instance.supplierSerialNumber;
    /*
      Supplier imei update scenarios:
        - From undefined to defined -> check exists
        - From defined to undefined
        - From defined to defined (different value) -> check exists
        - From defined to defined (same value)
    */
    const updatedSupplierImeiNumber = supplierImeiNumber
      ? supplierImeiNumber
      : supplierImeiNumber === null
      ? undefined
      : instance.supplierImeiNumber || undefined;

    const orConditions: (
      | { supplierSerialNumber: string }
      | { supplierImeiNumber: string }
    )[] = [];
    if (updatedSupplierSerialNumber !== instance.supplierSerialNumber) {
      orConditions.push({ supplierSerialNumber: updatedSupplierSerialNumber });
    }
    if (
      updatedSupplierImeiNumber &&
      updatedSupplierImeiNumber !== instance.supplierImeiNumber
    ) {
      orConditions.push({ supplierImeiNumber: updatedSupplierImeiNumber });
    }
    if (orConditions.length > 0) {
      const existingInstance = await VariationInstance.findOne({
        modelVariationId: variationId,
        $or: orConditions,
      }).lean();
      if (existingInstance) {
        return next(errorHandler(409, "Variation instance already exists."));
      }
    }

    // Update instance
    instance.supplierSerialNumber = updatedSupplierSerialNumber;
    instance.supplierImeiNumber = updatedSupplierImeiNumber;
    instance.conditionId = updatedConditionId;
    const updatedIsActive = isActive ?? instance.isActive;
    instance.inactiveAt =
      instance.isActive && !updatedIsActive ? new Date() : instance.inactiveAt; // If isActive change from true to false then update inactiveAt
    instance.isActive = updatedIsActive;

    await instance.save();

    res.status(200).json({
      success: true,
      message: "Variation instance updated successfully.",
      data: formatVariationInstanceResponse(instance),
    } as SuccessResponse<VariationInstanceResponse>);
    console.log("✅ Variation instance updated successfully.");
  } catch (error) {
    next(error);
  }
}

// --- HELPER FUNCTIONS ---
function getConditionId(conditionName: string): Types.ObjectId {
  const { instanceConditions } = appCache;
  if (!instanceConditions) {
    throw new Error("Application cache not initialized properly.");
  }

  const conditionId = instanceConditions[conditionName.toLowerCase()];
  if (!conditionId) {
    throw new Error(`Condition '${conditionName}' not found in cache.`);
  }

  return conditionId;
}

function getMovementTypeId(movementTypeName: string): Types.ObjectId {
  const { inventoryMovementTypes } = appCache;
  if (!inventoryMovementTypes) {
    throw new Error("Application cache not initialized properly.");
  }

  const movementTypeId = inventoryMovementTypes[movementTypeName.toLowerCase()];
  if (!movementTypeId) {
    throw new Error(`Movement type '${movementTypeName}' not found in cache.`);
  }

  return movementTypeId;
}

// async function handleCheckExistingModels(
//   productId: string | undefined,
//   modelId: string | undefined,
//   variationId: string | undefined,
//   instanceId: string | undefined,
//   next: NextFunction,
//   session: mongoose.ClientSession | undefined
// ): Promise<any> {
//   const models: any = {};

//   if (productId) {
//     if (!Types.ObjectId.isValid(productId)) {
//       return next(errorHandler(404, "Product not found."));
//     }
//     const product = await Product.findById(productId).session(session || null);
//     if (!product || product.isDeleted) {
//       return next(errorHandler(404, "Product not found."));
//     }
//     models.product = product;
//   }

//   if (modelId) {
//     if (!Types.ObjectId.isValid(modelId)) {
//       return next(errorHandler(404, "Model not found."));
//     }
//     const model = await ProductModel.findOne({
//       isDeleted: false,
//       _id: modelId,
//       productId,
//     }).session(session || null);
//     if (!model) {
//       return next(errorHandler(404, "Model not found."));
//     }
//     models.model = model;
//   }

//   if (variationId) {
//     if (!Types.ObjectId.isValid(variationId)) {
//       return next(errorHandler(404, "Variation not found."));
//     }
//     const variation = await ModelVariation.findOne({
//       isDeleted: false,
//       _id: variationId,
//       productModelId: modelId,
//     }).session(session || null);
//     if (!variation) {
//       return next(errorHandler(404, "Variation not found."));
//     }
//     models.variation = variation;
//   }

//   if (instanceId) {
//     if (!Types.ObjectId.isValid(instanceId)) {
//       return next(errorHandler(404, "Variation instance not found."));
//     }
//     const instance = await VariationInstance.findOne({
//       isDeleted: false,
//       _id: instanceId,
//       modelVariationId: variationId,
//     }).session(session || null);
//     if (!instance) {
//       return next(errorHandler(404, "Variation instance not found."));
//     }
//     models.instance = instance;
//   }

//   return models;
// }
