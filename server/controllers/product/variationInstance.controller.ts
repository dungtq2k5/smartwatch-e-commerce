import { Request, Response, NextFunction } from "express";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import ModelVariation from "../../models/product/modelVariation.model";
import VariationInstance from "../../models/product/variationInstance.model";
import type {
  AdminVariationInstanceDetailResponse,
  SuccessResponse,
  VariationInstanceCreate,
  VariationInstanceListResponse,
  VariationInstanceResponse,
  VariationInstanceSearchQuery,
  VariationInstanceUpdate,
} from "../../../common/types.common";
import {
  formatAdminVariationInstanceDetailResponse,
  formatVariationInstanceResponse,
  genInstanceSku,
  getInstanceConditionId,
  getMovementTypeId,
  isPresent,
} from "../../utils/utils";
import { appCache } from "../../configs/cache";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating variation instance...");

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
    modelVariationId: variationId,
    supplierSerialNumber,
    supplierImeiNumber,
    conditionId,
    isActive,
  } = req.body as VariationInstanceCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Variation not found.");
    }
    const variation = await ModelVariation.findOne({
      isDeleted: false,
      _id: variationId,
    }).session(session);
    if (!variation) {
      throw new HttpError(404, "Variation not found.");
    }

    // Business logic

    // Check supplier serial number is unique
    const orConditions: (
      | { supplierSerialNumber: string }
      | { supplierImeiNumber: string }
    )[] = [{ supplierSerialNumber }];
    if (supplierImeiNumber) orConditions.push({ supplierImeiNumber });
    const existingInstance = await VariationInstance.findOne({
      modelVariationId: variationId,
      $or: orConditions,
    })
      .lean()
      .session(session);
    if (existingInstance) {
      throw new HttpError(409, "Variation instance already exists.");
    }

    // Check condition exists
    if (conditionId) {
      if (!Types.ObjectId.isValid(conditionId)) {
        throw new HttpError(404, "Condition not found.");
      }

      const conditionIdList = Object.values(appCache.instanceConditions || {});
      if (!conditionIdList.includes(new Types.ObjectId(conditionId))) {
        throw new HttpError(404, "Condition not found.");
      }
    }

    // Create variation instance
    const sku = await genInstanceSku(variation._id);
    const instance = new VariationInstance({
      sku,
      modelVariationId: variationId,
      supplierSerialNumber,
      supplierImeiNumber,
      conditionId: conditionId || getInstanceConditionId("1"), // new
      isActive,
      inactiveAt: isActive ? undefined : new Date(),
    });

    await instance.save({ session });

    // Create inventory movement
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
  const { instanceId } = req.params;

  try {
    // Check instance exists
    if (!Types.ObjectId.isValid(instanceId)) {
      throw new HttpError(404, "Variation instance not found.");
    }
    const instance = await VariationInstance.findById(instanceId).lean();
    if (!instance) {
      throw new HttpError(404, "Variation instance not found.");
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

export async function adminGetDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin fetching variation instance details...");

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

  const { instanceId } = req.params;

  try {
    const aggregationResult = await VariationInstance.aggregate([
      { $match: { _id: new Types.ObjectId(instanceId) } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "inventorymovements",
          localField: "_id",
          foreignField: "variationInstanceId",
          as: "inventoryMovements",
          pipeline: [
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
            { $sort: { createdAt: -1 } },
            { $project: { variationInstanceId: 0, variationInstanceSku: 0 } },
          ],
        },
      },
    ]);

    const instance = aggregationResult[0];
    if (!instance) {
      throw new HttpError(404, "Variation instance not found.");
    }

    res.status(200).json({
      success: true,
      message: "Variation instance details fetched successfully.",
      data: formatAdminVariationInstanceDetailResponse(instance),
    } as SuccessResponse<AdminVariationInstanceDetailResponse>);
  } catch (error) {
    next(error);
  }
}

export async function adminSearch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Admin searching variation instances...");

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

  const reqQuery = req["sanitizedQuery"] as VariationInstanceSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  if (reqQuery.searchTerm) {
    const isValidObjId = Types.ObjectId.isValid(reqQuery.searchTerm);

    query.$or = [
      {
        _id: isValidObjId ? new Types.ObjectId(reqQuery.searchTerm) : undefined,
      },
      { sku: reqQuery.searchTerm },
      {
        modelVariationId: isValidObjId
          ? new Types.ObjectId(reqQuery.searchTerm)
          : undefined,
      },
      { supplierSerialNumber: reqQuery.searchTerm },
      { supplierImeiNumber: reqQuery.searchTerm },
    ];
  }

  if (reqQuery.conditionId) {
    if (!Types.ObjectId.isValid(reqQuery.conditionId)) {
      return next(new HttpError(400, "Invalid conditionId."));
    }

    query.conditionId = new Types.ObjectId(reqQuery.conditionId);
  }

  if (reqQuery.isActive) {
    query.isActive = reqQuery.isActive === "true";
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await VariationInstance.aggregate([
      { $match: query },
      OPTIMIZE_PIPELINE,
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const instances: VariationInstanceResponse[] =
      aggregationResult[0].data.map(formatVariationInstanceResponse);
    const total: number = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Variation instances fetched successfully.",
      data: {
        total: total,
        instances: {
          instances,
          total,
        },
        offset,
        limit,
      },
    } as SuccessResponse<VariationInstanceListResponse>);
    console.log("✅ Variation instances fetched successfully.");
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
  const { instanceId } = req.params;

  try {
    // Check instance exists
    if (!Types.ObjectId.isValid(instanceId)) {
      throw new HttpError(404, "Variation instance not found.");
    }
    const instance = await VariationInstance.findById(instanceId);
    if (!instance) {
      throw new HttpError(404, "Variation instance not found.");
    }

    // Business logic
    const { supplierSerialNumber, supplierImeiNumber, conditionId, isActive } =
      req.body as VariationInstanceUpdate;

    // Check conditionId exists
    const updatedConditionId =
      conditionId === null
        ? getInstanceConditionId("1") // new
        : conditionId
        ? new Types.ObjectId(conditionId)
        : instance.conditionId;
    if (!updatedConditionId.equals(instance.conditionId)) {
      if (!Types.ObjectId.isValid(updatedConditionId)) {
        throw new HttpError(404, "Condition not found.");
      }

      const conditionIdList = Object.values(appCache.instanceConditions || {});
      if (!conditionIdList.includes(updatedConditionId)) {
        throw new HttpError(404, "Condition not found.");
      }
    }

    // Check existing supplier serial and imei
    const updatedSupplierSerialNumber =
      supplierSerialNumber || instance.supplierSerialNumber;
    /*
      Supplier imei update scenarios:
        - From null to defined -> check exists
        - From defined to null
        - From defined to defined (different value) -> check exists
        - From defined to defined (same value)
    */
    const updatedSupplierImeiNumber =
      supplierImeiNumber === null
        ? null
        : supplierImeiNumber || instance.supplierImeiNumber;

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
        modelVariationId: instance.modelVariationId,
        $or: orConditions,
      }).lean();
      if (existingInstance) {
        throw new HttpError(409, "Variation instance already exists.");
      }
    }

    // Update instance
    const updatedIsActive = isActive ?? instance.isActive;

    instance.supplierSerialNumber = updatedSupplierSerialNumber;
    instance.supplierImeiNumber = updatedSupplierImeiNumber;
    instance.conditionId = updatedConditionId;
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
