import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errorHandler";
import {
  GrnCreateReceived,
  GrnResponse,
  SuccessResponse,
} from "../../common/types.common";
import {
  formatGrnResponse,
  genInstanceSkuSync,
  getGrnStateId,
  getGrnStateLookupId,
  getInstanceConditionId,
  getMovementTypeId,
  getPropsForInstanceSkuGen,
  isPresent,
} from "../utils/utils";
import mongoose, { Types } from "mongoose";
import Grn from "../models/inventory/grn.model";
import VariationInstance from "../models/product/variationInstance.model";
import ModelVariation from "../models/product/modelVariation.model";
import Provider from "../models/inventory/provider.model";
import InventoryMovement from "../models/inventory/inventoryMovement.model";
import User from "../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Create GRN...");

  const userId = req["auth"]?.userId
    ? new Types.ObjectId(req["auth"].userId)
    : null;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
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
        getGrnStateLookupId(new Types.ObjectId(grn.stateId)); // Throw error if not found
      } catch {
        throw new HttpError(404, "GRN state not found.");
      }
    }

    // Create GRN
    const createdGrn = new Grn({
      ...grn,
      stateId: grn.stateId || getGrnStateId("1"), // completed
    });

    await createdGrn.save({ session });

    // Create variation instances
    const instancesToCreate: any[] = [];
    const newInstanceConditionId = getInstanceConditionId("1"); // new
    const variationId = new Types.ObjectId(modelVariationId);
    const instanceSkuProps = await getPropsForInstanceSkuGen(
      variationId,
      session
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
      { session }
    );

    // Create inventory movements for each instance
    const inventoryMovementsToCreate: any[] = [];
    const stockAdjustInventoryMovementTypeId = getMovementTypeId("1"); // good receipts
    for (const instance of createdInstances) {
      inventoryMovementsToCreate.push({
        variationInstanceId: instance._id,
        variationInstanceSku: instance.sku,
        inventoryMovementTypeId: stockAdjustInventoryMovementTypeId,
        grnId: createdGrn._id,
        createdBy: userId,
        quantity: 1,
        notes: `Auto created by system from GRN ${createdGrn._id.toString()}`,
      });
    }
    await InventoryMovement.insertMany(inventoryMovementsToCreate, { session });

    // Prepare data for GRN response
    const user = await User.findById(userId)
      .select("fullName isDeleted")
      .lean()
      .session(session);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "Request user not found.");
    }
    const grnResponse: GrnResponse = formatGrnResponse({
      ...createdGrn.toObject(),
      createdBy: {
        _id: userId,
        fullName: user.fullName,
      },
    });

    await session.commitTransaction();

    res.status(201).json({
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
