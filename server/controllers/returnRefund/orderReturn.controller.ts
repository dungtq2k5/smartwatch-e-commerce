import { Request, Response, NextFunction } from "express";
import {
  OrderReturnCreate,
  OrderReturnResponse,
  OrderReturnSelfUpdate,
  SuccessResponse,
  OrderReturnStateUpdate,
  OrderReturnPickupStateUpdate,
  OrderReturnSearchQuery,
  OrderReturnListResponse,
  OrderReturnDetailsResponse,
  AdminOrderReturnSearchQuery,
  AdminOrderReturnListResponse,
  AdminOrderReturnDetailsResponse,
  OrderReturnStateUpdateBulk,
  OrderReturnPickupStateUpdateBulk,
  AdminOrderReturnResponse,
} from "../../../common/types.common";
import mongoose, { Types } from "mongoose";
import { HttpError } from "../../utils/errorHandler";
import { ReturnItem } from "../../utils/types";
import Order from "../../models/order/order.model";
import {
  formatAdminOrderReturnDetailsResponse,
  formatAdminOrderReturnResponse,
  formatOrderReturnDetailsResponse,
  formatOrderReturnResponse,
  getDeliveryStateLevel,
  getInstanceConditionId,
  getLatestStateId,
  getInventoryMovementTypeId,
  getOrderStateLevel,
  getPaymentStateLookupId,
  getPickupStateId,
  getPickupStateLevel,
  getPickupStateLookupId,
  getRefundStateId,
  getRefundStateLookupId,
  getReturnStateId,
  getReturnStateLevel,
  getReturnStateLookupId,
  getSysUserId,
  isPresent,
} from "../../utils/utils";
import {
  populationPath,
  populationPath as variationPopulationPath,
} from "../order/order.controller";
import OrderReturn, {
  IOrderReturn,
} from "../../models/returnRefund/orderReturn.model";
import ReturnReason from "../../models/returnRefund/returnReason.model";
import {
  MAX_ESTIMATE_PICKUP_TIME_GAP,
  ESTIMATE_PICKUP_TIME_GAP,
  MAX_ORDER_RETURN_IMG_UPLOAD,
  MAX_ORDER_RETURNS_TO_UPDATE_BULK,
} from "../../../common/configs.common";
import UserAddress from "../../models/user/userAddress.model";
import { deleteManyFileFromFirebaseStorage } from "../../utils/firebase";
import User from "../../models/user/user.model";
import { createRefund } from "../stripe.controller";
import ModelVariation from "../../models/product/modelVariation.model";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import VariationInstance from "../../models/product/variationInstance.model";
import { DEFAULT_SEARCH_LIMIT } from "../../configs/configs";

// --- BOTH BUYER AND ADMIN FUNCTIONS ---

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Returning order...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  const { orderId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check order exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId).lean().session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check order valid
    if (!order.canReturn) {
      throw new HttpError(400, "This order is no longer eligible for return.");
    }

    // Check permission
    if (isBuyerOnly && !order.userId.equals(userId)) {
      throw new HttpError(403, "You don't own this resource.");
    }

    /*
      Check order can be returned if:
        - orderState is at "delivered" or "completed" (an order can have multiple returns) state.
        - deliveryState is "delivered" state.
        - paymentState is "paid" state.
        - all return items are in "ordered" state and belong to order.
      Update order:
        - order.items: update state to "return pending" for returned items.
      Create orderReturn:
        - refundStates: add "pending" state.
        - pickupStates: add "pending" state.
        - states: add "pending" state.
    */

    // Check order state valid for return
    const latestOrderStateId = getLatestStateId(order.states);
    const latestOrderStateLevel = getOrderStateLevel(latestOrderStateId);
    if (![5, 6].includes(latestOrderStateLevel)) {
      // delivered, completed
      throw new HttpError(
        400,
        "Order can't be returned. Order state is not 'delivered' or 'completed'.",
      );
    }

    const latestDeliveryStateId = getLatestStateId(order.deliveryStates);
    const latestDeliveryStateLevel = getDeliveryStateLevel(
      latestDeliveryStateId,
    );
    if (latestDeliveryStateLevel !== 6) {
      // delivered
      throw new HttpError(
        400,
        "Order can't be returned. Delivery state is not 'delivered'.",
      );
    }

    const latestPaymentStateId = getLatestStateId(order.paymentStates);
    const latestPaymentStateLookupId =
      getPaymentStateLookupId(latestPaymentStateId);
    if (latestPaymentStateLookupId !== "2") {
      // paid
      throw new HttpError(
        400,
        "Order can't be returned. Payment state is not 'paid'.",
      );
    }

    const {
      reasonId,
      imageUrls,
      buyerReason,
      userAddressIdToPickup,
      estimatePickupDate,
      items,
    } = req.body as OrderReturnCreate;

    // Check reasonId valid
    if (!Types.ObjectId.isValid(reasonId)) {
      throw new HttpError(404, "Return reason not found.");
    }
    const returnReason = await ReturnReason.findById(reasonId)
      .lean()
      .session(session);
    if (!returnReason) {
      throw new HttpError(404, "Return reason not found.");
    }

    // Check imageUrls valid
    if (imageUrls && imageUrls.length > MAX_ORDER_RETURN_IMG_UPLOAD) {
      throw new HttpError(
        400,
        `You can upload up to ${MAX_ORDER_RETURN_IMG_UPLOAD} images.`,
      );
    }

    // Check userAddressIdToPickup valid
    if (!Types.ObjectId.isValid(userAddressIdToPickup)) {
      throw new HttpError(404, "Pickup address not found.");
    }
    const pickupAddress = await UserAddress.findOne({
      _id: userAddressIdToPickup,
      userId,
    })
      .lean()
      .session(session);
    if (!pickupAddress) {
      throw new HttpError(404, "Pickup address not found.");
    }

    // Check estimatePickupDate valid
    if (estimatePickupDate) {
      const now = new Date();
      const formattedEstimatePickupDate = new Date(estimatePickupDate);

      if (formattedEstimatePickupDate <= now) {
        throw new HttpError(
          400,
          "Estimated pickup date must be in the future.",
        );
      }
      if (
        formattedEstimatePickupDate.getTime() - now.getTime() >
        MAX_ESTIMATE_PICKUP_TIME_GAP
      ) {
        throw new HttpError(
          400,
          `Estimated pickup date must be within ${
            MAX_ESTIMATE_PICKUP_TIME_GAP / (24 * 60 * 60 * 1000)
          } days from now.`,
        );
      }
    }

    // Business logic
    const itemsToReturn: {
      variationId: Types.ObjectId | string;
      instanceIds: Types.ObjectId[] | string[];
    }[] =
      items === "all"
        ? order.items
            .map((item) => ({
              variationId: item.variationId,
              // Filter for instances that can actually be returned
              instanceIds: item.instances
                .filter((inst) => inst.state === "ordered")
                .map((inst) => inst.id),
            }))
            .filter((item) => item.instanceIds.length > 0)
        : items;

    if (itemsToReturn.length === 0) {
      throw new HttpError(400, "No returnable items found in the order.");
    }

    const allInstanceIdsToUpdate: Types.ObjectId[] = [];
    let totalRefundCents = 0;
    const returnItems: ReturnItem[] = [];

    for (const { variationId, instanceIds } of itemsToReturn) {
      const orderItem = order.items.find((oi) =>
        oi.variationId.equals(variationId),
      );
      if (!orderItem) {
        throw new HttpError(404, "Order item not found.");
      }

      const validatedInstances: ReturnItem["instances"] = [];
      const instancePrice = orderItem.totalCents / orderItem.quantity!;

      // Validate each instance ID from the request *before* doing any calculations.
      for (const instanceId of instanceIds) {
        const instanceInOrder = orderItem.instances.find((inst) =>
          inst.id.equals(instanceId),
        );

        // Check 1: Does this instance even belong to this order item?
        if (!instanceInOrder) {
          throw new HttpError(
            400,
            `Item instance with ID ${instanceId} was not found in this order.`,
          );
        }

        // Check 2: Is the instance in a returnable state?
        if (instanceInOrder.state !== "ordered") {
          throw new HttpError(
            400,
            `Item ${instanceInOrder.sku} cannot be returned as it is not in the 'ordered' state.`,
          );
        }

        // If all checks pass, it's a valid instance for return.
        validatedInstances.push({
          id: instanceInOrder.id,
          sku: instanceInOrder.sku,
        });
      }

      if (validatedInstances.length === 0) {
        // This would only happen if the input `instanceIds` was empty, but it's a good safeguard.
        continue;
      }

      // Now, perform calculations and data structuring using only the validated instances.
      totalRefundCents += instancePrice * validatedInstances.length;
      for (const inst of validatedInstances) {
        allInstanceIdsToUpdate.push(inst.id);
      }

      returnItems.push({
        variationId: new Types.ObjectId(variationId),
        quantity: validatedInstances.length,
        totalCents: instancePrice * validatedInstances.length,
        instances: validatedInstances,
      });
    }

    // Efficiently update order
    await Order.updateOne(
      { _id: orderId },
      { $set: { "items.$[].instances.$[inst].state": "return pending" } },
      {
        arrayFilters: [{ "inst.id": { $in: allInstanceIdsToUpdate } }],
        session,
      },
    );

    // Refund calculation
    const refundSummary = {
      toCardCents: 0,
      toBalanceCents: 0,
      finalRefundAmountCents: totalRefundCents,
    };

    const appliedBalance = order.paymentSummary.appliedBalanceCents!;
    if (appliedBalance >= totalRefundCents) {
      refundSummary.toBalanceCents = totalRefundCents;
    } else {
      refundSummary.toBalanceCents = appliedBalance;
      refundSummary.toCardCents = totalRefundCents - appliedBalance;
    }

    // Create orderReturn
    const orderReturn = new OrderReturn({
      orderId,
      refundSummary,
      refundStates: [{ id: getRefundStateId("1") }], // pending approval
      states: [{ id: getReturnStateId("1") }], // pending
      reasonId,
      imageUrls,
      buyerReason,
      estimatePickupDate:
        estimatePickupDate || new Date(Date.now() + ESTIMATE_PICKUP_TIME_GAP),
      pickupStates: [{ id: getPickupStateId("1") }], // pending
      pickupAddress,
      items: returnItems,
    });

    await orderReturn.save({ session });
    await orderReturn.populate(variationPopulationPath);
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Return order created.",
      data: formatOrderReturnResponse(orderReturn),
    } as SuccessResponse<OrderReturnResponse>);
    console.log("✅ ", "Return order created.");
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
  console.log("▶️ ", "Getting return order...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  const { returnId } = req.params;

  try {
    // Check return order exists
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }
    const orderReturn = await OrderReturn.findById(returnId);
    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    // Get order to check permission
    const order = await Order.findById(orderReturn.orderId)
      .select("userId")
      .lean();
    if (!order) {
      throw new HttpError(500, "Order for this return not found.");
    }

    // Check permission
    if (isBuyerOnly && !order.userId.equals(userId)) {
      throw new HttpError(403, "You don't own this resource.");
    }

    await orderReturn.populate(variationPopulationPath);

    res.status(200).json({
      success: true,
      message: "Return order retrieved.",
      data: formatOrderReturnResponse(orderReturn),
    } as SuccessResponse<OrderReturnResponse>);
    console.log("✅ ", "Return order retrieved.");
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting return order details...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  const { returnId } = req.params;

  try {
    // Check orderReturn exists
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }
    const orderReturn = await OrderReturn.findById(returnId)
      .populate(populationPath)
      .populate("refundStates.id", "lookupId name")
      .populate("pickupStates.id", "lookupId name level")
      .populate("states.id", "lookupId name level")
      .populate("reasonId", "name description")
      .lean();
    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    // Get order to check permission
    const order = await Order.findById(orderReturn.orderId)
      .select("userId")
      .lean();
    if (!order) {
      throw new HttpError(500, "Order for this return not found.");
    }

    // Check permission
    if (isBuyerOnly && !order.userId.equals(userId)) {
      throw new HttpError(403, "You don't own this resource.");
    }

    res.status(200).json({
      success: true,
      message: "Return order details retrieved.",
      data: formatOrderReturnDetailsResponse(orderReturn),
    } as SuccessResponse<OrderReturnDetailsResponse>);
    console.log("✅ ", "Return order details retrieved.");
  } catch (error) {
    next(error);
  }
}

// search within orderId
export async function searchSelfWithOrderId(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching self return orders...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  const { orderId } = req.params;
  const reqQuery = req["sanitizedQuery"] as OrderReturnSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;

  try {
    // Check order exists
    const order =
      Types.ObjectId.isValid(orderId) &&
      (await Order.findById(orderId).select("userId").lean());
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    if (isBuyerOnly && !order.userId.equals(userId)) {
      throw new HttpError(403, "You don't own this resource.");
    }

    const query = { orderId: new Types.ObjectId(orderId) };
    const total = await OrderReturn.countDocuments(query);
    const orderReturns = await OrderReturn.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate(variationPopulationPath)
      .lean();

    res.status(200).json({
      success: true,
      message: "Return orders retrieved.",
      data: {
        total,
        returns: {
          total: orderReturns.length,
          returns: orderReturns.map(formatOrderReturnResponse),
        },
        offset,
        limit,
      },
    } as SuccessResponse<OrderReturnListResponse>);
    console.log("✅ ", "Self return orders retrieved.");
  } catch (error) {
    next(error);
  }
}

// search without orderId
export async function searchSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching self return orders...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  const reqQuery = req["sanitizedQuery"] as OrderReturnSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  try {
    if (reqQuery.orderId) {
      // Check order exists
      const order =
        Types.ObjectId.isValid(reqQuery.orderId) &&
        (await Order.findById(reqQuery.orderId).select("userId").lean());
      if (!order) {
        throw new HttpError(404, "Order not found.");
      }
      if (isBuyerOnly && !order.userId.equals(userId)) {
        throw new HttpError(403, "You don't own this resource.");
      }

      query.orderId = new Types.ObjectId(reqQuery.orderId);
    } else {
      // Get all orderIds of the user
      const orders = await Order.find({ userId }).select("_id").lean();
      const orderIds = orders.map((o) => o._id);
      query.orderId = { $in: orderIds };
    }

    const total = await OrderReturn.countDocuments(query);
    const orderReturns = await OrderReturn.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate(variationPopulationPath)
      .lean();

    res.status(200).json({
      success: true,
      message: "Return orders retrieved.",
      data: {
        total,
        returns: {
          total: orderReturns.length,
          returns: orderReturns.map(formatOrderReturnResponse),
        },
        offset,
        limit,
      },
    } as SuccessResponse<OrderReturnListResponse>);
    console.log("✅ ", "Self return orders retrieved.");
  } catch (error) {
    next(error);
  }
}

export async function updateSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating return order...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  const { returnId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check return order exist
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }
    const orderReturn = await OrderReturn.findById(returnId).session(session);
    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    // Get order to check permission
    const order = await Order.findById(orderReturn.orderId)
      .select("_id userId")
      .lean();
    if (!order) {
      throw new HttpError(500, "Order for this return not found.");
    }

    // Check permission
    if (isBuyerOnly && !order.userId.equals(userId)) {
      throw new HttpError(403, "You don't own this resource.");
    }

    /*
      Business logic:
        - Can update orderReturn if returnState is "pending approval".
        - If returnState added "canceled" state -> update order.items back to "ordered" base on return.items.
    */

    // Check return order state valid for update
    const latestReturnStateId = getLatestStateId(orderReturn.states);
    const latestReturnStateLevel = getReturnStateLevel(latestReturnStateId);
    if (latestReturnStateLevel !== 1) {
      // pending approval
      throw new HttpError(
        400,
        "Return order can't be updated. Return state is not 'pending approval'.",
      );
    }

    const {
      reasonId,
      imageUrls,
      buyerReason,
      userAddressIdToPickup,
      estimatePickupDate,
      stateId,
    } = req.body as OrderReturnSelfUpdate;

    // Update reasonId
    const updatedReasonId = reasonId || orderReturn.reasonId;
    if (updatedReasonId !== orderReturn.reasonId) {
      if (!Types.ObjectId.isValid(updatedReasonId)) {
        throw new HttpError(404, "Return reason not found.");
      }
      const returnReason = await ReturnReason.findById(updatedReasonId)
        .lean()
        .session(session);
      if (!returnReason) {
        throw new HttpError(404, "Return reason not found.");
      }

      orderReturn.reasonId = new Types.ObjectId(updatedReasonId);
    }

    // Check imageUrls valid
    if (imageUrls && imageUrls.length > MAX_ORDER_RETURN_IMG_UPLOAD) {
      throw new HttpError(
        400,
        `You can upload up to ${MAX_ORDER_RETURN_IMG_UPLOAD} images.`,
      );
    }

    // Update buyerReason
    orderReturn.buyerReason =
      buyerReason === null ? null : buyerReason || orderReturn.buyerReason;

    // Update userAddressIdToPickup
    if (userAddressIdToPickup) {
      // Check exists
      if (!Types.ObjectId.isValid(userAddressIdToPickup)) {
        throw new HttpError(404, "Pickup address not found.");
      }
      const address = await UserAddress.findOne({
        _id: userAddressIdToPickup,
        userId,
      })
        .lean()
        .session(session);
      if (!address) {
        throw new HttpError(404, "Pickup address not found");
      }

      orderReturn.pickupAddress = address;
    }

    // Update estimatePickupDate
    if (estimatePickupDate) {
      const now = new Date();
      const formattedEstimatePickupDate = new Date(estimatePickupDate);

      if (formattedEstimatePickupDate <= now) {
        throw new HttpError(
          400,
          "Estimated pickup date must be in the future.",
        );
      }
      if (
        formattedEstimatePickupDate.getTime() - now.getTime() >
        MAX_ESTIMATE_PICKUP_TIME_GAP
      ) {
        throw new HttpError(
          400,
          `Estimated pickup date must be within ${
            MAX_ESTIMATE_PICKUP_TIME_GAP / (24 * 60 * 60 * 1000)
          } days from now.`,
        );
      }

      orderReturn.estimatePickupDate = formattedEstimatePickupDate;
    }

    // Update stateId (only to "cancelled")
    if (stateId) {
      const returnStateLookupId = getReturnStateLookupId(
        new Types.ObjectId(stateId),
      );
      if (returnStateLookupId !== "7") {
        // cancelled
        throw new HttpError(
          400,
          "You can only update return state to 'cancelled' state.",
        );
      }

      // Update items back to "ordered" state
      const allInstanceIdsToUpdate: (Types.ObjectId | string)[] = [];
      for (const item of orderReturn.items) {
        for (const inst of item.instances) {
          allInstanceIdsToUpdate.push(inst.id);
        }
      }

      await Order.updateOne(
        { _id: order._id },
        { $set: { "items.$[].instances.$[inst].state": "ordered" } },
        {
          arrayFilters: [{ "inst.id": { $in: allInstanceIdsToUpdate } }],
          session,
        },
      );
    }

    // Update imageUrls on Firebase Storage
    if (imageUrls && imageUrls.length > 0) {
      const imgUrlToRemove = orderReturn.imageUrls.filter(
        (url) => !imageUrls.includes(url),
      );
      if (imgUrlToRemove.length > 0) {
        await deleteManyFileFromFirebaseStorage(imgUrlToRemove, "order-return");
      }
    }
    orderReturn.imageUrls =
      imageUrls === null ? [] : imageUrls || orderReturn.imageUrls;

    await orderReturn.save({ session });
    await orderReturn.populate(variationPopulationPath);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Return order updated.",
      data: formatOrderReturnResponse(orderReturn),
    } as SuccessResponse<OrderReturnResponse>);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- ADMIN FUNCTIONS ---

// Similar to get function but with returnedBy field
export async function adminGet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Admin getting return order...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { returnId } = req.params;

  try {
    // Check return order exists
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }
    const orderReturn: any = await OrderReturn.findById(returnId)
      .populate(variationPopulationPath)
      .populate(returnedByPopulationPath)
      .lean();
    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    // Because of returnedByPopulationPath, we have to restructure the orderReturn data
    const restructuredReturn = {
      ...orderReturn,
      orderId: orderReturn.orderId._id,
      returnedBy: {
        _id: orderReturn.orderId.userId._id,
        fullName: orderReturn.orderId.userId.fullName,
      },
    };

    res.status(200).json({
      success: true,
      message: "Return order retrieved.",
      data: formatAdminOrderReturnResponse(restructuredReturn),
    } as SuccessResponse<AdminOrderReturnResponse>);
    console.log("✅ ", "Return order retrieved.");
  } catch (error) {
    next(error);
  }
}

export async function updateState(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating return order state...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { returnId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check return order exist
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }
    const orderReturn = await OrderReturn.findById(returnId).session(session);
    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    await handleReturnStateUpdate(
      userId,
      orderReturn,
      req.body as OrderReturnStateUpdate,
      session,
    );
    await orderReturn.populate(variationPopulationPath);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Return order state updated.",
      data: formatOrderReturnResponse(orderReturn),
    } as SuccessResponse<OrderReturnResponse>);
    console.log("✅ ", "Return order state updated.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updatePickupState(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating return order pickup state...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { returnId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check return order exist
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }
    const orderReturn = await OrderReturn.findById(returnId).session(session);
    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    await handlePickupStateUpdate(
      userId,
      orderReturn,
      req.body as OrderReturnPickupStateUpdate,
      session,
    );
    await orderReturn.populate(variationPopulationPath);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Return order pickup state updated.",
      data: formatOrderReturnResponse(orderReturn),
    } as SuccessResponse<OrderReturnResponse>);
    console.log("✅ ", "Return order pickup state updated.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// Normal version of search for understanding but not efficient for large data
/*
export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching return orders...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const reqQuery = req["sanitizedQuery"] as AdminOrderReturnSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  // Parse sortBy parameter
  const sort = (reqQuery.sortBy || "createdAt_desc").split("_");
  const sortField = sort[0];
  const sortOrder = sort[1] === "asc" ? 1 : -1;

  // Map sortField to actual database field path
  let sortStage: any;
  if (sortField === "finalRefundAmountCents") {
    // Sort by refundSummary.finalRefundAmountCents
    sortStage = { "refundSummary.finalRefundAmountCents": sortOrder, _id: 1 };
  } else {
    // Direct field mapping
    sortStage = { [sortField]: sortOrder, _id: 1 };
  }

  try {
    if (reqQuery.searchTerm) {
      // Search by orderId/userId/orderReturnId/user.fullName/user.email/user.phoneNumber
      const searchTerm = reqQuery.searchTerm;

      if (Types.ObjectId.isValid(searchTerm)) {
        query.$or = [
          { orderId: new Types.ObjectId(searchTerm) },
          { _id: new Types.ObjectId(searchTerm) },
        ];

        // Search by userId
        const ordersByUserId = await Order.find({
          userId: new Types.ObjectId(searchTerm),
        })
          .select("_id")
          .lean();
        const orderIdsByUserId = ordersByUserId.map((o) => o._id);
        query.$or.push({ orderId: { $in: orderIdsByUserId } });
      } else {
        // Search by user.fullName/user.email/user.phoneNumber
        const users = await User.find({
          $or: [
            { fullName: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
            { phoneNumber: { $regex: searchTerm, $options: "i" } },
          ],
        })
          .select("_id")
          .lean();
        const userIds = users.map((u) => u._id);
        const ordersByUserIds = await Order.find({ userId: { $in: userIds } })
          .select("_id")
          .lean();
        const orderIdsByUserIds = ordersByUserIds.map((o) => o._id);
        query.$or = [{ orderId: { $in: orderIdsByUserIds } }];
      }
    }

    if (
      reqQuery.finalRefundAmountCentsMin ||
      reqQuery.finalRefundAmountCentsMax
    ) {
      query["refundSummary.finalRefundAmountCents"] = {};

      if (reqQuery.finalRefundAmountCentsMin) {
        query["refundSummary.finalRefundAmountCents"].$gte = Number.parseInt(
          reqQuery.finalRefundAmountCentsMin,
          10,
        );
      }
      if (reqQuery.finalRefundAmountCentsMax) {
        query["refundSummary.finalRefundAmountCents"].$lte = Number.parseInt(
          reqQuery.finalRefundAmountCentsMax,
          10,
        );
      }
    }

    if (reqQuery.refundStateIds?.length) {
      const refundStateObjectIds = reqQuery.refundStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid refundStateId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query["refundStates.id"] = { $in: refundStateObjectIds };
    }

    if (reqQuery.pickupStateIds?.length) {
      const pickupStateObjectIds = reqQuery.pickupStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid pickupStateId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query["pickupStates.id"] = { $in: pickupStateObjectIds };
    }

    if (reqQuery.stateIds?.length) {
      const stateObjectIds = reqQuery.stateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid stateId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query["states.id"] = { $in: stateObjectIds };
    }

    if (reqQuery.reasonIds?.length) {
      const reasonObjectIds = reqQuery.reasonIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid reasonId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query.reasonId = { $in: reasonObjectIds };
    }

    if (reqQuery.pickupDateFrom || reqQuery.pickupDateTo) {
      query.pickupDate = {};

      if (reqQuery.pickupDateFrom) {
        query.pickupDate.$gte = new Date(reqQuery.pickupDateFrom);
      }
      if (reqQuery.pickupDateTo) {
        query.pickupDate.$lte = new Date(reqQuery.pickupDateTo);
      }
    }

    if (reqQuery.estimatePickupDateFrom || reqQuery.estimatePickupDateTo) {
      query.estimatePickupDate = {};

      if (reqQuery.estimatePickupDateFrom) {
        query.estimatePickupDate.$gte = new Date(
          reqQuery.estimatePickupDateFrom,
        );
      }
      if (reqQuery.estimatePickupDateTo) {
        query.estimatePickupDate.$lte = new Date(reqQuery.estimatePickupDateTo);
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

    if (reqQuery.updatedAtFrom || reqQuery.updatedAtTo) {
      query.updatedAt = {};

      if (reqQuery.updatedAtFrom) {
        query.updatedAt.$gte = new Date(reqQuery.updatedAtFrom);
      }
      if (reqQuery.updatedAtTo) {
        query.updatedAt.$lte = new Date(reqQuery.updatedAtTo);
      }
    }

    const total = await OrderReturn.countDocuments(query);
    const orderReturns = await OrderReturn.find(query)
      .sort(sortStage)
      .skip(offset)
      .limit(limit)
      .populate(variationPopulationPath)
      .populate({
        path: "orderId",
        select: "userId",
        populate: {
          path: "userId",
          select: "_id fullName",
        },
      })
      .lean();

    // Map to format with returnedBy field included and restructure orderId to ID string
    const formattedReturns: AdminOrderReturnResponse[] = orderReturns.map((orderReturn: any) => {
      return {
        ...formatOrderReturnResponse({
          ...orderReturn,
          orderId: orderReturn.orderId._id,
        }),
        returnedBy: {
          id: orderReturn.orderId.userId._id,
          fullName: orderReturn.orderId.userId.fullName,
        },
      };
    });

    res.status(200).json({
      success: true,
      message: "Return orders retrieved.",
      data: {
        total,
        returns: {
          total: orderReturns.length,
          returns: formattedReturns,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminOrderReturnListResponse>);
    console.log("✅ ", "Return orders retrieved.");
  } catch (error) {
    next(error);
  }
}
*/

// Optimized version of search - based on working commented version with performance improvements
export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching return orders...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const reqQuery = req["sanitizedQuery"] as AdminOrderReturnSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  // Parse sortBy parameter
  const sort = (reqQuery.sortBy || "createdAt_desc").split("_");
  const sortField = sort[0];
  const sortOrder = sort[1] === "asc" ? 1 : -1;

  // Map sortField to actual database field path
  let sortStage: any;
  if (sortField === "finalRefundAmountCents") {
    // Sort by refundSummary.finalRefundAmountCents
    sortStage = { "refundSummary.finalRefundAmountCents": sortOrder, _id: 1 };
  } else {
    // Direct field mapping
    sortStage = { [sortField]: sortOrder, _id: 1 };
  }

  try {
    if (reqQuery.searchTerm) {
      // Search by orderId/userId/orderReturnId/user.fullName/user.email/user.phoneNumber
      const searchTerm = reqQuery.searchTerm;

      if (Types.ObjectId.isValid(searchTerm)) {
        query.$or = [
          { orderId: new Types.ObjectId(searchTerm) },
          { _id: new Types.ObjectId(searchTerm) },
        ];

        // Search by userId
        const ordersByUserId = await Order.find({
          userId: new Types.ObjectId(searchTerm),
        })
          .select("_id")
          .lean();
        const orderIdsByUserId = ordersByUserId.map((o) => o._id);
        query.$or.push({ orderId: { $in: orderIdsByUserId } });
      } else {
        // Search by user.fullName/user.email/user.phoneNumber
        const users = await User.find({
          $or: [
            { fullName: { $regex: searchTerm, $options: "i" } },
            { email: { $regex: searchTerm, $options: "i" } },
            { phoneNumber: { $regex: searchTerm, $options: "i" } },
          ],
        })
          .select("_id")
          .lean();
        const userIds = users.map((u) => u._id);
        const ordersByUserIds = await Order.find({ userId: { $in: userIds } })
          .select("_id")
          .lean();
        const orderIdsByUserIds = ordersByUserIds.map((o) => o._id);
        query.$or = [{ orderId: { $in: orderIdsByUserIds } }];
      }
    }

    if (
      reqQuery.finalRefundAmountCentsMin ||
      reqQuery.finalRefundAmountCentsMax
    ) {
      query["refundSummary.finalRefundAmountCents"] = {};

      if (reqQuery.finalRefundAmountCentsMin) {
        query["refundSummary.finalRefundAmountCents"].$gte = Number.parseInt(
          reqQuery.finalRefundAmountCentsMin,
          10,
        );
      }
      if (reqQuery.finalRefundAmountCentsMax) {
        query["refundSummary.finalRefundAmountCents"].$lte = Number.parseInt(
          reqQuery.finalRefundAmountCentsMax,
          10,
        );
      }
    }

    if (reqQuery.refundStateIds?.length) {
      const refundStateObjectIds = reqQuery.refundStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid refundStateId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query["refundStates.id"] = { $in: refundStateObjectIds };
    }

    if (reqQuery.pickupStateIds?.length) {
      const pickupStateObjectIds = reqQuery.pickupStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid pickupStateId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query["pickupStates.id"] = { $in: pickupStateObjectIds };
    }

    if (reqQuery.stateIds?.length) {
      const stateObjectIds = reqQuery.stateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid stateId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query["states.id"] = { $in: stateObjectIds };
    }

    if (reqQuery.reasonIds?.length) {
      const reasonObjectIds = reqQuery.reasonIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid reasonId: ${id}`);
        }
        return new Types.ObjectId(id);
      });

      query.reasonId = { $in: reasonObjectIds };
    }

    if (reqQuery.pickupDateFrom || reqQuery.pickupDateTo) {
      query.pickupDate = {};

      if (reqQuery.pickupDateFrom) {
        query.pickupDate.$gte = new Date(reqQuery.pickupDateFrom);
      }
      if (reqQuery.pickupDateTo) {
        query.pickupDate.$lte = new Date(reqQuery.pickupDateTo);
      }
    }

    if (reqQuery.estimatePickupDateFrom || reqQuery.estimatePickupDateTo) {
      query.estimatePickupDate = {};

      if (reqQuery.estimatePickupDateFrom) {
        query.estimatePickupDate.$gte = new Date(
          reqQuery.estimatePickupDateFrom,
        );
      }
      if (reqQuery.estimatePickupDateTo) {
        query.estimatePickupDate.$lte = new Date(reqQuery.estimatePickupDateTo);
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

    if (reqQuery.updatedAtFrom || reqQuery.updatedAtTo) {
      query.updatedAt = {};

      if (reqQuery.updatedAtFrom) {
        query.updatedAt.$gte = new Date(reqQuery.updatedAtFrom);
      }
      if (reqQuery.updatedAtTo) {
        query.updatedAt.$lte = new Date(reqQuery.updatedAtTo);
      }
    }

    // Use Promise.all for parallel execution: count and fetch
    const [total, orderReturns] = await Promise.all([
      OrderReturn.countDocuments(query),
      OrderReturn.find(query)
        .sort(sortStage)
        .skip(offset)
        .limit(limit)
        .populate(variationPopulationPath)
        .populate({
          path: "orderId",
          select: "userId",
          populate: {
            path: "userId",
            select: "_id fullName",
          },
        })
        .lean(),
    ]);

    // Map to format with returnedBy field included and restructure orderId to ID string
    const formattedReturns: AdminOrderReturnResponse[] = orderReturns.map(
      (orderReturn: any) => {
        return {
          ...formatOrderReturnResponse({
            ...orderReturn,
            orderId: orderReturn.orderId._id,
          }),
          returnedBy: {
            id: orderReturn.orderId.userId._id,
            fullName: orderReturn.orderId.userId.fullName,
          },
        };
      },
    );

    res.status(200).json({
      success: true,
      message: "Return orders retrieved.",
      data: {
        total,
        returns: {
          total: orderReturns.length,
          returns: formattedReturns,
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminOrderReturnListResponse>);
    console.log("✅ ", "Return orders retrieved.");
  } catch (error) {
    next(error);
  }
}

// Like getDetails but for admin with more details
export async function adminGetDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting return order details...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { returnId } = req.params;

  try {
    if (!Types.ObjectId.isValid(returnId)) {
      throw new HttpError(404, "Return order not found.");
    }

    const orderReturn: any = await OrderReturn.findById(returnId)
      .populate(populationPath)
      .populate("refundStates.id", "lookupId name")
      .populate("pickupStates.id", "lookupId name level")
      .populate("states.id", "lookupId name level")
      .populate("reasonId", "name description")
      .populate(returnedByPopulationPath)
      .lean();

    if (!orderReturn) {
      throw new HttpError(404, "Return order not found.");
    }

    // Because of returnedByPopulationPath, we have to restructure the orderReturn data
    const restructuredReturn = {
      ...orderReturn,
      orderId: orderReturn.orderId._id,
      returnedBy: {
        _id: orderReturn.orderId.userId._id,
        fullName: orderReturn.orderId.userId.fullName,
      },
    };

    res.status(200).json({
      success: true,
      message: "Return order details retrieved.",
      data: formatAdminOrderReturnDetailsResponse(restructuredReturn),
    } as SuccessResponse<AdminOrderReturnDetailsResponse>);
    console.log("✅ ", "Return order details retrieved.");
  } catch (error) {
    next(error);
  }
}

export async function updateStateBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk updating return order states...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { returnIds, returnStateId, notes } =
    req.body as OrderReturnStateUpdateBulk;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (returnIds.length > MAX_ORDER_RETURNS_TO_UPDATE_BULK) {
      throw new HttpError(
        400,
        `You can only update up to ${MAX_ORDER_RETURNS_TO_UPDATE_BULK} return orders at once.`,
      );
    }

    const returns = await OrderReturn.find({ _id: { $in: returnIds } }).session(
      session,
    );
    if (returns.length !== returnIds.length) {
      throw new HttpError(404, "One or more return orders not found.");
    }

    for (const orderReturn of returns) {
      await handleReturnStateUpdate(
        userId,
        orderReturn,
        { returnStateId, notes },
        session,
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Return order states updated.",
    } as SuccessResponse);
    console.log("✅ ", "Return order states updated.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updatePickupStateBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk updating return order pickup states...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "userId or isBuyerOnly not found, this should be handled in middlewares.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { returnIds, pickupStateId, estimatePickupDate, notes } =
    req.body as OrderReturnPickupStateUpdateBulk;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (returnIds.length > MAX_ORDER_RETURNS_TO_UPDATE_BULK) {
      throw new HttpError(
        400,
        `You can only update up to ${MAX_ORDER_RETURNS_TO_UPDATE_BULK} return orders at once.`,
      );
    }

    const returns = await OrderReturn.find({ _id: { $in: returnIds } }).session(
      session,
    );
    if (returns.length !== returnIds.length) {
      throw new HttpError(404, "One or more return orders not found.");
    }

    for (const orderReturn of returns) {
      await handlePickupStateUpdate(
        userId,
        orderReturn,
        { pickupStateId, estimatePickupDate, notes },
        session,
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Return order pickup states updated.",
    } as SuccessResponse);
    console.log("✅ ", "Return order pickup states updated.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// ---HELPER FUNCTIONS ---

// Handle refund logic, add returnState and refundState for orderReturn, update user balance if needed.
async function handleRefund(
  orderReturn: IOrderReturn,
  session: mongoose.ClientSession,
): Promise<void> {
  console.log("▶️ ", "Executing refund...");

  try {
    /*
      Business logic:
        - Can execute refund if refundState is "pending" state.
        - If finalRefundAmountCents is 0 -> quit soon.
        - If toBalanceCents > 0 -> update user.userBalanceCents
        - If toCardCents > 0 -> refund via Stripe, if failed -> refund via balance as backup.
        - Create refundTransaction for orderReturn if refund via Stripe succeed.
    */

    const { toCardCents, toBalanceCents, finalRefundAmountCents } =
      orderReturn.refundSummary;
    const sysUserId = getSysUserId();

    if (finalRefundAmountCents === 0) {
      console.log("✅ ", "No refund needed as final refund amount is 0.");
      orderReturn.states.push({
        id: getReturnStateId("6"),
        notes: "No refund needed as final refund amount is 0.",
        createdBy: sysUserId,
      }); // refunded
      return;
    }

    const latestRefundStateId = getLatestStateId(orderReturn.refundStates);
    const latestRefundStateLookupId =
      getRefundStateLookupId(latestRefundStateId);
    if (latestRefundStateLookupId !== "1") {
      // pending
      throw new HttpError(
        400,
        "Refund can't be executed. Refund state is not 'pending'.",
      );
    }

    const order = await Order.findById(orderReturn.orderId)
      .lean()
      .session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    const user = await User.findById(order.userId).session(session);
    if (!user) {
      throw new HttpError(404, "User not found.");
    }

    // Refund to balance
    if (toBalanceCents > 0) {
      user.userBalanceCents += toBalanceCents;
      if (toCardCents === 0) {
        orderReturn.refundStates.push({
          id: getRefundStateId("3"),
          notes: "Full amount refunded to balance",
          createdBy: sysUserId,
        }); // refunded to balance
      }
    }

    // Refund to card via Stripe
    if (toCardCents > 0) {
      if (order.transaction?.paymentIntentId && user.stripeCustomerId) {
        try {
          const refund = await createRefund(
            order.transaction.paymentIntentId,
            toCardCents,
          );

          // Create refundTransaction
          orderReturn.refundTransaction = {
            amountCents: refund.amount,
            currency: refund.currency,
            transactionDate: new Date(refund.created * 1000), // Convert to JS Date
            paymentIntentId: refund.payment_intent as string,
          };

          orderReturn.refundStates.push({
            id: getRefundStateId("2"),
            notes: "Amount refunded to card",
            createdBy: sysUserId,
          }); // refunded via Stripe

          console.log(
            `✅ `,
            `Successfully refunded ${toCardCents} cents for return ${orderReturn._id} via Stripe.`,
          );
        } catch (stripeError) {
          console.error(
            "❌ ",
            `Stripe refund failed for return ${orderReturn._id}. Refunding to user balance as a fallback.`,
            stripeError,
          );

          orderReturn.refundStates.push({
            id: getRefundStateId("4"),
            notes:
              "Refund via Stripe failed, refunded to balance as a fallback.",
            createdBy: sysUserId,
          }); // refund via Stripe failed
          user.userBalanceCents += toCardCents;
          orderReturn.refundStates.push({
            id: getRefundStateId("3"),
            notes:
              "Refunded to balance as a fallback after Stripe refund failure.",
            createdBy: sysUserId,
          }); // refunded to balance
        }
      } else {
        // Fallback to user balance if no Stripe transaction or customerId
        console.log(
          `Refunding to user balance for return ${orderReturn._id} as no Stripe transaction or customer ID found.`,
        );
        user.userBalanceCents += toCardCents;
        orderReturn.refundStates.push({
          id: getRefundStateId("3"),
          notes:
            "Refunded to balance as no Stripe transaction or customer ID found.",
          createdBy: sysUserId,
        }); // refunded to balance
      }
    }

    // Update returnState to "refunded" state
    orderReturn.states.push({
      id: getReturnStateId("6"),
      notes: "Refund process completed.",
      createdBy: sysUserId,
    }); // refunded

    await user.save({ session });
    console.log(
      "✅ ",
      `Refund process completed for return ${orderReturn._id}.`,
    );
  } catch (error) {
    console.error(
      "❌ ",
      `Error executing refund for return ${orderReturn._id}:`,
      error,
    );
    throw error;
  }
}

async function executeItemsReturned(
  orderToReturn: IOrderReturn,
  session: mongoose.ClientSession,
): Promise<void> {
  console.log("▶️ ", "Executing items return...");

  try {
    /*
      Business logic:
        - Update order.items to "returned" state base on return.items.
        - Update conditionId of each instance to "used", keep isActive = false.
        - Create inventoryMovement "return from customer" for each instance.
        - Restore stockQuantity for each returned variation.
    */

    // Prepare for updating
    const allInstanceIdsToUpdate = orderToReturn.items
      .flatMap((item) => item.instances)
      .map((inst) => inst.id);

    const returnFromCusMovementTypeId = getInventoryMovementTypeId("8");
    const sysUserId = getSysUserId();
    const inventoriesToInsert: {
      variationInstanceId: Types.ObjectId | string;
      sku: string;
      inventoryMovementTypeId: Types.ObjectId | string;
      createdBy: Types.ObjectId | string;
      quantity: 1;
      notes: "Return from customer";
    }[] = orderToReturn.items.flatMap((item) =>
      item.instances.map((inst) => {
        return {
          variationInstanceId: inst.id,
          sku: inst.sku,
          inventoryMovementTypeId: returnFromCusMovementTypeId,
          createdBy: sysUserId,
          quantity: 1,
          notes: "Return from customer",
        };
      }),
    );

    const variationStockUpdates = orderToReturn.items.map((item) => ({
      updateOne: {
        filter: { _id: item.variationId },
        update: { $inc: { stockQuantity: item.quantity } },
      },
    }));

    // Execute updates
    await Promise.all([
      // Update order items
      Order.updateOne(
        { _id: orderToReturn.orderId },
        { $set: { "items.$[].instances.$[inst].state": "returned" } },
        {
          arrayFilters: [
            {
              "inst.id": { $in: allInstanceIdsToUpdate },
            },
          ],
          session,
        },
      ),

      // Update instances conditionId
      VariationInstance.updateMany(
        { _id: { $in: allInstanceIdsToUpdate } },
        { $set: { conditionId: getInstanceConditionId("2") } }, // used
        { session },
      ),

      // Create inventory movements
      InventoryMovement.insertMany(inventoriesToInsert, { session }),

      // Update variations stockQuantity
      ModelVariation.bulkWrite(variationStockUpdates, { session }),
    ]);
    console.log(
      "✅ ",
      `Items return executed for return ${orderToReturn._id}.`,
    );
  } catch (error) {
    console.error(
      "❌ ",
      `Error executing items return for return ${orderToReturn._id}:`,
      error,
    );
    throw error;
  }
}

async function handleReturnStateUpdate(
  reqUserId: Types.ObjectId | string,
  orderReturn: IOrderReturn,
  updateData: OrderReturnStateUpdate,
  session: mongoose.ClientSession,
  saveReturn: boolean = true,
): Promise<void> {
  try {
    /*
      Business logic (returnState):
        - Can update when returnState is not in "refunded", "cancelled", "declined" states.
        - Only update forward.
        - returnState add:
          + "approved" state.
          + "declined" state -> update order.items to "return declined" state base on return.items.
          + "refunding" state -> handleRefund().
    */

    // Check return order state valid for update
    const latestReturnStateId = getLatestStateId(orderReturn.states);
    const latestReturnStateLevel = getReturnStateLevel(latestReturnStateId);
    if (latestReturnStateLevel === 6) {
      // refunded, cancelled, declined
      throw new HttpError(
        400,
        "Return order state can't be updated. Return state is in 'refunded', 'cancelled' or 'declined' state.",
      );
    }

    const { returnStateId: returnStateIdRaw, notes } = updateData;
    const returnStateId = new Types.ObjectId(returnStateIdRaw);

    // Check returnStateId exists
    if (!Types.ObjectId.isValid(returnStateId)) {
      throw new HttpError(404, "Return state not found.");
    }
    const returnStateLookupId = getReturnStateLookupId(returnStateId);

    // Can only be updated forward
    const returnStateLevel = getReturnStateLevel(returnStateId);
    if (returnStateLevel <= latestReturnStateLevel) {
      throw new HttpError(400, "Return state can only be updated forward.");
    }

    switch (returnStateLookupId) {
      // approved
      case "2": {
        orderReturn.states.push({
          id: returnStateId,
          notes: notes || "Return request approved by admin.",
          createdBy: new Types.ObjectId(reqUserId),
        });
        break;
      }
      // declined
      case "8": {
        const latestReturnStateLookupId =
          getReturnStateLookupId(latestReturnStateId);
        if (latestReturnStateLookupId === "2") {
          // approved
          throw new HttpError(
            400,
            "You had approved this return order. You can't decline it.",
          );
        }
        orderReturn.states.push({
          id: returnStateId,
          notes: notes || "Return request declined by admin.",
          createdBy: new Types.ObjectId(reqUserId),
        });

        // Update items to "return declined" state
        const allInstanceIdsToUpdate: (Types.ObjectId | string)[] = [];
        for (const item of orderReturn.items) {
          for (const inst of item.instances) {
            allInstanceIdsToUpdate.push(inst.id);
          }
        }

        await Order.updateOne(
          { _id: orderReturn.orderId },
          { $set: { "items.$[].instances.$[inst].state": "return declined" } },
          {
            arrayFilters: [{ "inst.id": { $in: allInstanceIdsToUpdate } }],
            session,
          },
        );
        break;
      }
      // refunding
      case "5": {
        const latestReturnStateLookupId =
          getReturnStateLookupId(latestReturnStateId);
        if (latestReturnStateLookupId !== "4") {
          // items returned
          throw new HttpError(
            400,
            "Return state can only be updated to 'refunding' state if the latest return state is 'items returned' state.",
          );
        }

        orderReturn.states.push({
          id: returnStateId,
          notes: notes || "Refund process initiated by admin.",
          createdBy: new Types.ObjectId(reqUserId),
        });
        await handleRefund(orderReturn, session);
        break;
      }
      default:
        throw new HttpError(400, "Invalid return state.");
    }

    if (saveReturn) await orderReturn.save({ session });
  } catch (error) {
    console.error("❌ ", "Error updating return state:", error);
    throw error;
  }
}

async function handlePickupStateUpdate(
  reqUserId: Types.ObjectId | string,
  orderReturn: IOrderReturn,
  updateData: OrderReturnPickupStateUpdate,
  session: mongoose.ClientSession,
  saveReturn: boolean = true,
): Promise<void> {
  try {
    /*
      Business logic (pickupState):
        - Can update when returnState is from "approved".
        - Can be updated forward except "pickup failed" to "pickup rescheduled" state.
        - pickupState add:
          + "out for pickup", "picked up", "in transit to warehouser" state -> add returnState "items returning" state.
          + "returned to warehouse" state -> add returnState "items returned" state, executeItemsReturned().
          + "pickup failed" state: if pickupState is in "out for pickup" state.
          + "pickup rescheduled" state: if pickupState is in "pickup failed" state.
    */

    // Check returnState valid for update pickupState
    const latestReturnStateId = getLatestStateId(orderReturn.states);
    const latestReturnStateLookupId =
      getReturnStateLookupId(latestReturnStateId);
    if (!["2", "3", "4"].includes(latestReturnStateLookupId)) {
      // not in approved, items returning, items returned
      throw new HttpError(
        400,
        "Return order pickup state can't be updated. Return must be approved and not finalized.",
      );
    }

    const { pickupStateId, estimatePickupDate, notes } = updateData;

    // Update pickupState
    const latestPickupStateId = getLatestStateId(orderReturn.pickupStates);
    if (pickupStateId && pickupStateId !== latestPickupStateId.toString()) {
      // Check pickupStateId exists
      if (!Types.ObjectId.isValid(pickupStateId)) {
        throw new HttpError(404, "Pickup state not found.");
      }

      // Handle special case: pickup failed -> pickup rescheduled
      const pickupStateLookupId = getPickupStateLookupId(
        new Types.ObjectId(pickupStateId),
      );
      if (pickupStateLookupId === "7") {
        // pickup rescheduled
        const latestPickupStateLookupId =
          getPickupStateLookupId(latestPickupStateId);
        if (latestPickupStateLookupId !== "6") {
          // pickup failed
          throw new HttpError(
            400,
            "You can only update pickup state to 'pickup rescheduled' state if the latest pickup state is 'pickup failed' state.",
          );
        }
      } else {
        // Can only be updated forward
        const pickupStateLevel = getPickupStateLevel(
          new Types.ObjectId(pickupStateId),
        );
        const latestPickupStateLevel = getPickupStateLevel(latestPickupStateId);
        if (pickupStateLevel <= latestPickupStateLevel) {
          throw new HttpError(400, "Pickup state can only be updated forward.");
        }

        // --- Trigger Consequential State Updates ---
        const sysUserId = getSysUserId();
        switch (pickupStateLookupId) {
          case "2": // out for pickup
          case "3": // picked up
          // in transit to warehouse
          case "4": {
            const latestReturnStateLookupId =
              getReturnStateLookupId(latestReturnStateId);
            if (latestReturnStateLookupId === "2") {
              // approved
              orderReturn.states.push({
                id: getReturnStateId("3"),
                notes: "Auto updated to 'items returning' state.",
                createdBy: sysUserId,
              });
            }
            break;
          }
          // returned to warehouse
          case "5": {
            await executeItemsReturned(orderReturn, session);
            orderReturn.states.push({
              id: getReturnStateId("4"),
              notes: "Auto updated to 'items returned' state.",
              createdBy: sysUserId,
            }); // items returned

            break;
          }
          case "6": // pickup failed
            break;
          // pickup rescheduled will be handle above since check level only forward
          default:
            throw new HttpError(400, "Invalid pickup state.");
        }
      }

      orderReturn.pickupStates.push({
        id: new Types.ObjectId(pickupStateId),
        notes: notes || null,
        createdBy: new Types.ObjectId(reqUserId),
      });
    }

    // Update estimatePickupDate
    if (estimatePickupDate) {
      const now = new Date();
      const formattedEstimatePickupDate = new Date(estimatePickupDate);

      if (formattedEstimatePickupDate <= now) {
        throw new HttpError(
          400,
          "Estimated pickup date must be in the future.",
        );
      }
      if (
        formattedEstimatePickupDate.getTime() - now.getTime() >
        MAX_ESTIMATE_PICKUP_TIME_GAP
      ) {
        throw new HttpError(
          400,
          `Estimated pickup date must be within ${
            MAX_ESTIMATE_PICKUP_TIME_GAP / (24 * 60 * 60 * 1000)
          } days from now.`,
        );
      }

      orderReturn.estimatePickupDate = formattedEstimatePickupDate;
    }

    if (saveReturn) await orderReturn.save({ session });
  } catch (error) {
    console.error("❌ ", "Error updating pickup state:", error);
    throw error;
  }
}

const returnedByPopulationPath = {
  path: "orderId",
  select: "_id userId",
  populate: {
    path: "userId",
    select: "_id fullName",
  },
};
