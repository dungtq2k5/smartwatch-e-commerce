import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../utils/errorHandler";
import {
  GrnCreateReceived,
  GrnDetailsItem,
  GrnDetailsResponse,
  GrnListResponse,
  GrnResponse,
  GrnSearchQuery,
  GrnUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import {
  formatGrnDetailsResponse,
  formatGrnResponse,
  genInstanceSkuSync,
  getGrnStateId,
  getGrnStateLookupId,
  getInstanceConditionId,
  getInventoryMovementTypeId,
  getPropsForInstanceSkuGen,
  isPresent,
} from "../../utils/utils";
import mongoose, { Types } from "mongoose";
import Grn from "../../models/inventory/grn.model";
import VariationInstance from "../../models/product/variationInstance.model";
import ModelVariation from "../../models/product/modelVariation.model";
import Provider from "../../models/inventory/provider.model";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { LOOKUP_ID } from "../../../common/configs.common";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Create GRN...");

  const reqUser = req["user"];
  if (!isPresent(reqUser)) {
    return next(
      new HttpError(
        500,
        "Request user not found, this should be handled in middlewares.",
      ),
    );
  }

  const { modelVariationId, providerId, grn, instances } =
    req.body as GrnCreateReceived;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation, provider exists
    if (!Types.ObjectId.isValid(modelVariationId)) {
      throw new HttpError(404, "Model variation not found.");
    }
    if (!Types.ObjectId.isValid(providerId)) {
      throw new HttpError(404, "Provider not found.");
    }

    const variation = await ModelVariation.findById(modelVariationId)
      .select("isDeleted")
      .lean()
      .session(session);
    if (!variation || variation.isDeleted) {
      throw new HttpError(404, "Model variation not found.");
    }
    const provider = await Provider.findById(providerId)
      .select("isDeleted")
      .lean()
      .session(session);
    if (!provider || provider.isDeleted) {
      throw new HttpError(404, "Provider not found.");
    }

    // Check grn.stateId exists - if provided
    if (isPresent(grn.stateId)) {
      try {
        getGrnStateLookupId(grn.stateId); // Throw error if not found
      } catch {
        throw new HttpError(404, "GRN state not found.");
      }
    }

    // Create GRN
    const createdGrn = new Grn({
      ...grn,
      providerId,
      stateId: grn.stateId || getGrnStateId("1"), // completed
      createdBy: reqUser._id,
    });

    await createdGrn.save({ session });

    // Create variation instances
    const instancesToCreate: any[] = [];
    const newInstanceConditionId = getInstanceConditionId(LOOKUP_ID.INSTANCE_CONDITION.NEW); // new
    const variationId = new Types.ObjectId(modelVariationId);
    const instanceSkuProps = await getPropsForInstanceSkuGen(
      variationId,
      session,
    );

    for (const instance of instances) {
      instancesToCreate.push({
        ...instance,
        sku: genInstanceSkuSync(instanceSkuProps),
        modelVariationId: variationId,
        conditionId: newInstanceConditionId,
      });
    }
    const createdInstances = await VariationInstance.insertMany(
      instancesToCreate,
      { session },
    );

    // Create inventory movements for each instance
    const inventoryMovementsToCreate: any[] = [];
    const stockAdjustInventoryMovementTypeId = getInventoryMovementTypeId("1"); // good receipts
    for (const instance of createdInstances) {
      inventoryMovementsToCreate.push({
        variationInstanceId: instance._id,
        variationInstanceSku: instance.sku,
        inventoryMovementTypeId: stockAdjustInventoryMovementTypeId,
        grnId: createdGrn._id,
        createdBy: reqUser._id,
        quantity: 1,
        notes: `Auto created by system from GRN ${createdGrn._id.toString()}`,
      });
    }
    await InventoryMovement.insertMany(inventoryMovementsToCreate, { session });

    await session.commitTransaction();

    const grnResponse: GrnResponse = formatGrnResponse({
      ...createdGrn.toObject(),
      createdBy: {
        _id: reqUser._id,
        fullName: reqUser.fullName,
      },
    });

    res.status(201).json({
      success: true,
      message: "GRN created successfully.",
      data: grnResponse,
    } as SuccessResponse<GrnResponse>);
    console.log("✅ ", "GRN created successfully.");
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
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Get GRN...");
  const { grnId } = req.params;

  try {
    if (!Types.ObjectId.isValid(grnId)) {
      throw new HttpError(404, "GRN not found.");
    }
    const grn = await Grn.aggregate([
      { $match: { _id: new Types.ObjectId(grnId) } },
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
    ]).then((results) => results[0]);
    if (!grn) {
      throw new HttpError(404, "GRN not found.");
    }

    res.status(200).json({
      success: true,
      message: "GRN retrieved successfully.",
      data: formatGrnResponse(grn),
    } as SuccessResponse<GrnResponse>);
    console.log("✅ ", "GRN retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Get GRN details...");
  const { grnId } = req.params;

  try {
    /* Business logic:
      - Get and return a list of GRN which connected to each other (reversedByGrnId).
    */

    if (!Types.ObjectId.isValid(grnId)) {
      throw new HttpError(404, "GRN not found.");
    }
    const grns = await Grn.aggregate([
      { $match: { _id: new Types.ObjectId(grnId) } },
      // Find ancestors (past version that point to this one or its parents)
      {
        $graphLookup: {
          from: "grns",
          startWith: "$_id",
          connectFromField: "reversedByGrnId",
          connectToField: "_id",
          as: "ancestors",
        },
      },
      // Find descendants (newer version that this one or its children point to)
      {
        $graphLookup: {
          from: "grns",
          startWith: "$reversedByGrnId",
          connectFromField: "reversedByGrnId",
          connectToField: "_id",
          as: "descendants",
        },
      },
      // Combine all
      {
        $project: {
          allGrns: {
            $concatArrays: [["$$ROOT"], "$ancestors", "$descendants"],
          },
        },
      },
      { $unwind: "$allGrns" },
      { $replaceRoot: { newRoot: "$allGrns" } },
      // Remove duplicates (graphLookup may produce duplicates)
      { $group: { _id: "$_id", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
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
          from: "providers",
          localField: "providerId",
          foreignField: "_id",
          as: "provider",
          pipeline: [OPTIMIZE_CREATED_BY_PIPELINE],
        },
      },
      { $unwind: "$provider" },
      // Sort by creation time
      { $sort: { createdAt: 1, _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      message: "GRN details retrieved successfully.",
      data: {
        total: grns.length,
        grns: grns.map(formatGrnDetailsResponse),
      },
    } as SuccessResponse<GrnDetailsResponse>);
    console.log("✅ ", "GRN details retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Search GRNs...");

  const reqQuery = req["sanitizedQuery"] as GrnSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  const searchTerm = reqQuery.searchTerm;
  if (searchTerm) {
    const isId = Types.ObjectId.isValid(searchTerm);

    const matchingProviders = isId
      ? [
          {
            _id: new Types.ObjectId(searchTerm),
          },
        ]
      : await Provider.find({
          fullName: { $regex: searchTerm, $options: "i" },
          isDeleted: false,
        })
          .select("_id")
          .lean();
    const matchingProviderIds = matchingProviders.map((p) => p._id);

    query.$or = [
      {
        _id: isId ? new Types.ObjectId(searchTerm) : undefined,
      },
      { name: { $regex: searchTerm, $options: "i" } },
      {
        providerId: { $in: matchingProviderIds },
      },
      { notes: { $regex: searchTerm, $options: "i" } },
    ];
  }

  if (reqQuery.totalPriceCentsMin || reqQuery.totalPriceCentsMax) {
    query.totalPriceCents = {};
    if (reqQuery.totalPriceCentsMin) {
      query.totalPriceCents.$gte = Number.parseInt(
        reqQuery.totalPriceCentsMin,
        10,
      );
    }
    if (reqQuery.totalPriceCentsMax) {
      query.totalPriceCents.$lte = Number.parseInt(
        reqQuery.totalPriceCentsMax,
        10,
      );
    }
  }

  if (reqQuery.createdAtFrom || reqQuery.createdAtTo) {
    query.createdAt = {};
    if (reqQuery.createdAtFrom) {
      query.createdAt.$gte = new Date(reqQuery.createdAtFrom);
    }
    if (reqQuery.createdAtTo) {
      query.createdAt.$lte = new Date(reqQuery.createdAtTo);
    }
  }

  if (reqQuery.stateId) {
    query.stateId = Types.ObjectId.isValid(reqQuery.stateId)
      ? new Types.ObjectId(reqQuery.stateId)
      : null;
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "asc" ? 1 : -1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregationResult = await Grn.aggregate([
      { $match: query },
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
          from: "providers",
          localField: "providerId",
          foreignField: "_id",
          as: "provider",
          pipeline: [OPTIMIZE_CREATED_BY_PIPELINE],
        },
      },
      { $unwind: "$provider" },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]);

    const grns: GrnDetailsItem[] = aggregationResult[0].data.map(
      formatGrnDetailsResponse,
    );
    const total = aggregationResult[0].metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "GRNs retrieved successfully.",
      data: {
        total,
        grns: {
          total: grns.length,
          grns: grns,
        },
        offset,
        limit,
      },
    } as SuccessResponse<GrnListResponse>);
    console.log("✅ ", "GRNs retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Update GRN...");

  const reqUser = req["user"];
  if (!isPresent(reqUser)) {
    return next(
      new HttpError(
        500,
        "Request user not found, this should be handled in middlewares.",
      ),
    );
  }

  const { grnId } = req.params;
  const {
    name,
    providerId,
    totalPriceCents,
    notes,
    stateId,
    inventoryMovement,
  } = req.body as GrnUpdate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    /*
      Business logic:
        - If GRN to update not found or is reversed -> throw error.
        - Create new grn and link to current grn.
        - Create new inventory movements and link to new grn.
    */

    // Check GRN exists
    if (!Types.ObjectId.isValid(grnId)) {
      throw new HttpError(404, "GRN not found.");
    }
    const existingGrn = await Grn.findById(grnId).session(session);
    if (!existingGrn) {
      throw new HttpError(404, "GRN not found.");
    }
    if (existingGrn.reversedByGrnId) {
      throw new HttpError(400, "Cannot update a reversed GRN.");
    }

    // Check provider exists - if provided
    if (providerId) {
      if (!Types.ObjectId.isValid(providerId)) {
        throw new HttpError(404, "Provider not found.");
      }
      const provider = await Provider.findById(providerId)
        .select("isDeleted")
        .lean()
        .session(session);
      if (!provider || provider.isDeleted) {
        throw new HttpError(404, "Provider not found.");
      }
    }

    // Check grn.stateId exists - if provided
    if (stateId) {
      try {
        getGrnStateLookupId(stateId); // Throw error if not found
      } catch {
        throw new HttpError(404, "GRN state not found.");
      }
    }

    // Check inventoryMovement.typeId exists
    const movementType = getInventoryMovementTypeId(
      inventoryMovement.typeId,
      false,
    );
    if (!movementType) {
      throw new HttpError(404, "Inventory movement type not found.");
    }

    // Create new GRN and link to existing GRN
    const newGrn = new Grn({
      name: name || existingGrn.name,
      providerId: providerId || existingGrn.providerId,
      createdBy: reqUser._id,
      totalPriceCents: totalPriceCents ?? existingGrn.totalPriceCents,
      notes: notes === null ? notes : notes || existingGrn.notes,
      stateId: stateId || existingGrn.stateId,
    });
    await newGrn.save({ session });

    existingGrn.reversedByGrnId = newGrn._id;
    existingGrn.reversedAt = new Date();
    await existingGrn.save({ session });

    // Create inventory movements for new GRN
    const existingMovements = await InventoryMovement.find({
      grnId: existingGrn._id,
    })
      .lean()
      .session(session);

    const movementsToCreate: any[] = [];
    for (const movement of existingMovements) {
      movementsToCreate.push({
        variationInstanceId: movement.variationInstanceId,
        variationInstanceSku: movement.variationInstanceSku,
        inventoryMovementTypeId: inventoryMovement.typeId,
        grnId: newGrn._id,
        createdBy: reqUser._id,
        quantity: inventoryMovement.quantity,
        notes: inventoryMovement.notes || null,
      });
    }

    await InventoryMovement.insertMany(movementsToCreate, { session });

    await session.commitTransaction();

    const grnResponse: GrnResponse = formatGrnResponse({
      ...newGrn.toObject(),
      createdBy: {
        _id: reqUser._id,
        fullName: reqUser.fullName,
      },
    });

    res.status(200).json({
      success: true,
      message: "GRN updated successfully.",
      data: grnResponse,
    } as SuccessResponse<GrnResponse>);
    console.log("✅ ", "GRN updated successfully.");
  } catch (error) {
    next(error);
  }
}
