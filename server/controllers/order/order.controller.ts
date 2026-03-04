import { Request, Response, NextFunction } from "express";
import type {
  OrderCreate,
  OrderDetailsResponse,
  OrderListResponse,
  OrderResponse,
  OrderSearchQuery,
  OrderUpdate,
  OrderFulfillItemUpdate,
  OrderSelfUpdate,
  SuccessResponse,
  AdminOrderResponse,
  AdminOrderDetailsResponse,
  AdminOrderSearchQuery,
  AdminOrderListResponse,
  OrderUpdateBulk,
} from "../../../common/types.common";
import { HttpError } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import UserAddress from "../../models/user/userAddress.model";
import ModelVariation from "../../models/product/modelVariation.model";
import VariationInstance from "../../models/product/variationInstance.model";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import {
  formatAdminOrderDetailsResponse,
  formatAdminOrderResponse,
  formatOrderDetailsResponse,
  formatOrderResponse,
  getDeliveryStateId,
  getDeliveryStateLevel,
  getDeliveryStateLookupId,
  getLatestStateId,
  getMovementTypeId,
  getOrderStateId,
  getOrderStateLevel,
  getOrderStateLookupId,
  getPaymentMethodLookupId,
  getPaymentStateId,
  getPaymentStateLookupId,
  getSysUserId,
  isPresent,
} from "../../utils/utils";
import Order, { IOrder } from "../../models/order/order.model";
import {
  ESTIMATE_RECEIVED_TIME_GAP,
  MAX_ORDERS_TO_UPDATE_BULK,
} from "../../../common/configs.common";
import Cart from "../../models/user/cart.model";
import User from "../../models/user/user.model";
import { createRefund } from "../stripe.controller";
import CancelReason from "../../models/order/cancelReason.model";
import { compareUserAddress } from "../../../common/utils.common";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_PIPELINE,
  RETURN_POLICY_DAYS,
} from "../../configs/configs";

// --- BOTH BUYER AND ADMIN FUNCTIONS ---
export async function createSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating order...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID is missing, this should handled by middleware.",
      ),
    );
  }

  const { userAddressId, items, paymentMethodId, applyUserBalance } =
    req.body as OrderCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(userAddressId)) {
      throw new HttpError(404, "User address not found.");
    }
    const address = await UserAddress.findOne({
      _id: userAddressId,
      userId,
    })
      .lean()
      .session(session);
    if (!address) {
      throw new HttpError(404, "User address not found.");
    }

    // Check payment method exists
    if (!Types.ObjectId.isValid(paymentMethodId)) {
      throw new HttpError(404, "Payment method not found.");
    }
    const paymentMethodLookupId = getPaymentMethodLookupId(
      new Types.ObjectId(paymentMethodId),
    );

    /*
      Business logic:
        1. Check if there is also an order with the same userId and orderStates is ["pending"]
          -> remove it first (make sure there is always maximum one order is pending for each user).
        2. Check available items.
        3. Update each variation stock.
        4. Update each instance state (handled in fulfill).
        5. Create InventoryMovement for each instance (handled in fulfill).
        6. Remove all items from cart if has + COD order.
        7. Create order.
    */

    // Check if there is an existing non-COD order with the same userId and paymentStatusId is "pending"
    const orderPendingStateId = getOrderStateId("1");
    const isCOD = paymentMethodLookupId === "1";
    if (!isCOD) {
      const existingPendingOrder = await Order.findOne({
        userId,
        "paymentStates.id": orderPendingStateId,
        paymentStates: { $size: 1 },
      }).session(session);
      if (existingPendingOrder) {
        // Remove the existing pending order
        await handleOrderDeletion(existingPendingOrder, session);
      }
    }

    // Check items exist and available and init data for order creation
    const orderItemsInsert: {
      variationId: Types.ObjectId | string;
      quantity: number;
      totalCents: number;
      instances: { id: Types.ObjectId | string; sku: string }[];
    }[] = [];

    for (const { variationId, quantity } of items) {
      if (!Types.ObjectId.isValid(variationId)) {
        throw new HttpError(404, "Variation not found.");
      }

      // Find and update variation stock
      const populatedVariation = await ModelVariation.findOneAndUpdate(
        {
          isDeleted: false,
          _id: variationId,
          stockQuantity: { $gte: quantity },
          stopSelling: false,
        },
        { $inc: { stockQuantity: -quantity } },
        { session, new: false }, // returns the document before update
      ).populate({
        path: "productModelId",
        select: "priceCents stopSelling isDeleted",
        populate: {
          path: "productId",
          select: "stopSelling isDeleted",
        },
      });

      if (!populatedVariation) {
        throw new HttpError(404, "Variation not found or not enough stock.");
      }

      const variation = populatedVariation as any;
      const model = variation.productModelId;
      const product = model.productId;

      if (
        model.stopSelling ||
        product.stopSelling ||
        model.isDeleted ||
        product.isDeleted
      ) {
        throw new HttpError(404, "Variation not available for ordering.");
      }

      orderItemsInsert.push({
        variationId,
        quantity,
        totalCents:
          (model.priceCents + variation.additionalPriceCents) * quantity,
        instances: [], // Assign later by fulfill-item route
      });
    }

    // Calculating total cents
    const user = req["user"]; // From middleware
    if (!user) {
      throw new HttpError(
        500,
        "User information is missing, this should handled by middleware.",
      );
    }
    const subtotalCents = orderItemsInsert.reduce(
      (sum, item) => sum + item.totalCents,
      0,
    );
    let appliedBalanceCents = 0;
    let finalAmountCents = subtotalCents;

    if (applyUserBalance && user.userBalanceCents > 0) {
      const balanceToApply = Math.min(user.userBalanceCents, subtotalCents);
      appliedBalanceCents = balanceToApply;
      finalAmountCents -= balanceToApply;

      // Update user's balance
      await User.findByIdAndUpdate(
        userId,
        { $inc: { userBalanceCents: -balanceToApply } },
        { session },
      );
    }

    /*
      Create order:
        - paymentMethodId is COD:
          + deliveryStates: add pending and processing states.
          + paymentStates: add pending state.
          + orderStates: add pending and confirmed states.
          + orderDate: now.
          + delete user's cart.
        - paymentMethodId is non-COD:
          + deliveryStates: add pending state.
          + paymentStates: add pending state.
          + orderStates: add pending state.
          + delete user's cart will be handled in the webhook after successful payment.
    */
    const order = new Order({
      userId,
      items: orderItemsInsert,
      paymentSummary: {
        subtotalCents,
        appliedBalanceCents,
        finalAmountCents,
      },
      estimateReceivedDate: new Date(Date.now() + ESTIMATE_RECEIVED_TIME_GAP),
      deliveryAddress: address,
      paymentMethodId,
    });

    const deliveryPendingStateId = getDeliveryStateId("1");
    const paymentPendingStateId = getPaymentStateId("1");
    const notes = "User order, system auto generated.";
    const sysUserId = getSysUserId();
    if (isCOD) {
      order.deliveryStates.push({
        id: deliveryPendingStateId,
        notes,
        createdBy: sysUserId,
      });
      order.paymentStates.push({
        id: paymentPendingStateId,
        notes,
        createdBy: sysUserId,
      });
      order.states.push(
        {
          id: orderPendingStateId,
          notes,
          createdBy: sysUserId,
        },
        {
          id: getOrderStateId("2"), // confirmed
          notes,
          createdBy: sysUserId,
        },
      );
      order.orderDate = new Date();
      await executeCartDeletion(userId, items, session);
    } else {
      order.deliveryStates.push({
        id: deliveryPendingStateId,
        notes,
        createdBy: sysUserId,
      });
      order.paymentStates.push({
        id: paymentPendingStateId,
        notes,
        createdBy: sysUserId,
      });
      order.states.push({
        id: orderPendingStateId,
        notes,
        createdBy: sysUserId,
      });
    }

    await order.save({ session });
    await order.populate(populationPath);

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
    console.log("✅ ", "Order created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function getSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting self order by ID...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or role is missing, this should handled by middleware.",
      ),
    );
  }
  const { orderId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId).populate(populationPath).lean();
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    if (!order.userId.equals(userId) && isBuyerOnly) {
      throw new HttpError(
        403,
        "You do not have permission to view this order.",
      );
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
    console.log("✅ ", "Self order retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getSelfDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting self order details by ID...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or role is missing, this should handled by middleware.",
      ),
    );
  }
  const { orderId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }

    const order = await Order.findById(orderId)
      .populate(populationPath)
      .populate("paymentMethodId", "name")
      .populate("paymentStates.id", "lookupId name")
      .populate("deliveryStates.id", "lookupId name level")
      .populate("states.id", "lookupId name level")
      .populate("buyerCancelReasonId", "_id name description")
      .lean();

    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    if (!order.userId.equals(userId) && isBuyerOnly) {
      throw new HttpError(
        403,
        "You do not have permission to view this order.",
      );
    }

    res.status(200).json({
      success: true,
      message: "Order details retrieved successfully.",
      data: formatOrderDetailsResponse(order),
    } as SuccessResponse<OrderDetailsResponse>);
    console.log("✅ ", "Self order details retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function searchSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching self orders...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID is missing, this should handled by middleware.",
      ),
    );
  }

  const reqQuery = req["sanitizedQuery"] as OrderSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const baseMatch: any = {
    userId: new Types.ObjectId(userId), // Search own orders only
  };
  const exprConditions: any[] = [];

  try {
    if (reqQuery.deliveryStateIds?.length) {
      const deliveryStateObjIds = reqQuery.deliveryStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid delivery status ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      exprConditions.push({
        $in: [
          { $arrayElemAt: ["$deliveryStates.id", -1] },
          deliveryStateObjIds,
        ],
      });
    }

    if (reqQuery.paymentStateIds?.length) {
      const paymentStateObjIds = reqQuery.paymentStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid payment status ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      exprConditions.push({
        $in: [{ $arrayElemAt: ["$paymentStates.id", -1] }, paymentStateObjIds],
      });
    }

    if (reqQuery.stateIds?.length) {
      const stateObjIds = reqQuery.stateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid order status ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      exprConditions.push({
        $in: [{ $arrayElemAt: ["$states.id", -1] }, stateObjIds],
      });
    }

    if (exprConditions.length > 0) {
      baseMatch.$expr = { $and: exprConditions };
    }

    let finalQuery: any = baseMatch;
    let total: number;

    if (reqQuery.searchTerm) {
      // product/model/variation name, or order ID
      const searchTerm = reqQuery.searchTerm;
      const searchOrConditions: any[] = [
        { "productDetails.name": { $regex: searchTerm, $options: "i" } },
        { "modelDetails.name": { $regex: searchTerm, $options: "i" } },
        { "variationDetails.name": { $regex: searchTerm, $options: "i" } },
      ];

      // If the searchTerm is a valid ObjectId, also search by order ID first
      if (Types.ObjectId.isValid(searchTerm)) {
        searchOrConditions.push({ _id: new Types.ObjectId(searchTerm) });
      }

      const matchingOrders = await Order.aggregate([
        // 1. Initial filter for the user and other query params
        { $match: baseMatch },
        OPTIMIZE_PIPELINE,
        // 2. Unwind the items array to process each item individually
        { $unwind: "$items" },
        // 3. Lookup variation details
        {
          $lookup: {
            from: "modelvariations",
            localField: "items.variationId",
            foreignField: "_id",
            as: "variationDetails",
          },
        },
        { $unwind: "$variationDetails" },
        // 4. Lookup model details
        {
          $lookup: {
            from: "productmodels",
            localField: "variationDetails.productModelId",
            foreignField: "_id",
            as: "modelDetails",
          },
        },
        { $unwind: "$modelDetails" },
        // 5. Lookup product details
        {
          $lookup: {
            from: "products",
            localField: "modelDetails.productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        { $match: { $or: searchOrConditions } },
        { $group: { _id: "$_id" } },
      ]);

      const orderIds = matchingOrders.map((order) => order._id);

      // If no orders match -> return early
      if (orderIds.length === 0) {
        res.status(200).json({
          success: true,
          message: "No orders found.",
          data: {
            total: 0,
            orders: { total: 0, orders: [] },
            offset,
            limit,
          },
        } as SuccessResponse<OrderListResponse>);
        return;
      }

      finalQuery = { _id: { $in: orderIds } };
      total = orderIds.length;
    } else {
      // If no search term, the total is a simple count
      total = await Order.countDocuments(baseMatch);
    }

    // Fetch the orders using the final query and populate them
    const orders = await Order.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate(populationPath)
      .lean();

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully.",
      data: {
        total,
        orders: {
          total: orders.length,
          orders: orders.map(formatOrderResponse),
        },
        offset,
        limit,
      },
    } as SuccessResponse<OrderListResponse>);
    console.log("✅ ", "Self orders retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function updateSelf(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating self order...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or role is missing, this should handled by middleware.",
      ),
    );
  }
  const { orderId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    if (isBuyerOnly && order.userId.toString() !== userId) {
      throw new HttpError(
        403,
        "You do not have permission to update this order.",
      );
    }

    /*
      Business logic (orderState, deliveryAddressId):
        - Can update when order isn't in "completed", "cancelled" states.
        - Can change deliveryAddress when orderState is before "placed".
        - Can change orderState to "completed" when orderState is "delivered".
        - Can change orderState to "cancelled" when deliveryState is before "placed".

        - For COD orders:
          - orderState changed to:
            + "cancelled":
              -> handleOrderDeletion(order, session, { deleteOrderItself: false });
              -> orderStates: add "cancelled" state.
              - refund userBalanceCents if has.
        - For non-COD orders:
          - orderState changed to:
            + "cancelled":
              -> handleOrderDeletion(order, session, { deleteOrderItself: false });
              -> paymentStatuses: add "refunded via Stripe/refunded to balance" state.
              -> refund: handleCancelRefund().
    */

    // Check if order is completed - level 6 -> can't be updated anymore
    const latestOrderStateId = getLatestStateId(order.states);
    const latestOrderStateLevel = getOrderStateLevel(latestOrderStateId);

    if (latestOrderStateLevel === 6) {
      // completed
      throw new HttpError(
        400,
        "Order cannot be updated after it has been completed or cancelled.",
      );
    }

    const { stateId, deliveryAddressId, buyerCancelReasonId } =
      req.body as OrderSelfUpdate;

    // Update order state
    if (stateId && stateId !== latestOrderStateId.toString()) {
      // Check exists
      if (!Types.ObjectId.isValid(stateId)) {
        throw new HttpError(404, "Order state not found.");
      }
      const orderStateLookupId = getOrderStateLookupId(
        new Types.ObjectId(stateId),
      );

      // Can't update order state if non-COD paymentState isn't paid yet
      const latestPaymentStateId = getLatestStateId(order.paymentStates);
      const isPaid = getPaymentStateLookupId(latestPaymentStateId) === "2";
      const isCOD =
        getPaymentMethodLookupId(new Types.ObjectId(order.paymentMethodId)) ===
        "1";

      if (!isCOD && !isPaid) {
        throw new HttpError(
          400,
          "Cannot update delivery state for non-COD orders that haven't been paid yet.",
        );
      }

      // --- Trigger Consequential State Updates ---
      switch (orderStateLookupId) {
        // completed
        case "6": {
          const latestDeliveryStateId = getLatestStateId(order.deliveryStates);
          const latestDeliveryStateLevel = getDeliveryStateLevel(
            latestDeliveryStateId,
          );
          if (latestDeliveryStateLevel !== 6 || latestOrderStateLevel !== 5) {
            // delivered
            throw new HttpError(
              400,
              "Order must be in 'delivered' state to update to 'completed'.",
            );
          }

          break;
        }
        // cancelled
        case "7": {
          if (latestOrderStateLevel >= 3) {
            // "placed"
            throw new HttpError(
              400,
              "Order can only be cancelled before it is placed.",
            );
          }

          // Check buyerCancelReasonId and assign
          if (!buyerCancelReasonId) {
            throw new HttpError(
              400,
              "Cancel reason is required to cancel order.",
            );
          }

          if (!Types.ObjectId.isValid(buyerCancelReasonId)) {
            throw new HttpError(404, "Cancel reason not found.");
          }

          const reason = await CancelReason.findById(buyerCancelReasonId)
            .select("_id")
            .lean()
            .session(session);
          if (!reason) {
            throw new HttpError(404, "Cancel reason not found.");
          }

          order.buyerCancelReasonId = reason._id;

          await handleOrderDeletion(order, session, {
            deleteOrderItself: false,
          });

          // Handle refund logic
          if (isCOD && order.paymentSummary.appliedBalanceCents > 0) {
            // Refund to user balance
            await User.findByIdAndUpdate(
              userId,
              {
                $inc: {
                  userBalanceCents: order.paymentSummary.appliedBalanceCents,
                },
              },
              { session },
            );
            order.paymentStates.push({
              id: getPaymentStateId("5"),
              notes: "Refunded to user balance due to order cancellation.",
              createdBy: getSysUserId(),
            }); // refunded to balance
          }
          if (!isCOD) {
            order.paymentStates.push({
              id: getPaymentStateId("4"),
              notes: "Refunded via Stripe due to order cancellation.",
              createdBy: getSysUserId(),
            }); // refunded via Stripe
            await handleCancelRefund(order, session); // Auto handle refunded to balance if needed
          }
          break;
        }
        default: {
          throw new HttpError(
            403,
            "You do not have permission to update order state.",
          );
        }
      }

      order.states.push({
        id: new Types.ObjectId(stateId),
        notes: "Order state updated by user.",
        createdBy: new Types.ObjectId(userId),
      });
    }

    // Update deliveryStateId
    if (deliveryAddressId) {
      // Check exists
      if (!Types.ObjectId.isValid(deliveryAddressId)) {
        throw new HttpError(404, "Delivery address not found.");
      }
      const address = await UserAddress.findOne({
        _id: deliveryAddressId,
        userId,
      })
        .lean()
        .session(session);
      if (!address) {
        throw new HttpError(404, "Delivery address not found.");
      }

      // Check if order state is before "placed"
      if (
        !compareUserAddress(address, order.deliveryAddress) &&
        latestOrderStateLevel >= 3
      ) {
        throw new HttpError(
          400,
          "Delivery address can only be updated before the order is shipped.",
        );
      }

      order.deliveryAddress = address;
    }

    await order.save({ session });
    await order.populate(populationPath);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
    console.log("✅ ", "Order updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- ADMIN FUNCTIONS ---
export async function get(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting order by ID...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly is missing, this should handled by middleware.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { orderId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId)
      .populate(populationPath)
      .populate("userId", "_id fullName")
      .lean();
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully.",
      data: formatAdminOrderResponse(order),
    } as SuccessResponse<AdminOrderResponse>);
    console.log("✅ ", "Order retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Getting order details by ID...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly is missing, this should handled by middleware.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { orderId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }

    const order = await Order.findById(orderId)
      .populate(populationPath)
      .populate("userId", "_id fullName")
      .populate("paymentMethodId", "name")
      .populate("paymentStates.id", "lookupId name")
      .populate("deliveryStates.id", "lookupId name level")
      .populate("states.id", "lookupId name level")
      .populate("fulfilledBy", "_id fullName")
      .populate("buyerCancelReasonId", "_id name description")
      .lean();

    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    res.status(200).json({
      success: true,
      message: "Order details retrieved successfully.",
      data: formatAdminOrderDetailsResponse(order),
    } as SuccessResponse<AdminOrderDetailsResponse>);
    console.log("✅ ", "Order details retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching orders...");

  const isBuyerOnly = req["auth"]?.isBuyerOnly;
  if (!isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "isBuyerOnly is missing, this should handled by middleware.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const reqQuery = req["sanitizedQuery"] as AdminOrderSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const baseMatch: any = {};
  const exprConditions: any[] = [];

  // Parse sortBy parameter
  const sort = (reqQuery.sortBy || "createdAt_desc").split("_");
  const sortField = sort[0];
  const sortOrder = sort[1] === "asc" ? 1 : -1;

  // Map sortField to actual database field path
  let sortStage: any;
  if (sortField === "totalPriceCents") {
    // Sort by paymentSummary.finalAmountCents
    sortStage = { "paymentSummary.finalAmountCents": sortOrder, _id: 1 };
  } else {
    // Direct field mapping for fulfilledAt, createdAt, orderDate, estimateReceivedDate, receivedDate
    sortStage = { [sortField]: sortOrder, _id: 1 };
  }

  try {
    if (reqQuery.orderedBy) {
      if (!Types.ObjectId.isValid(reqQuery.orderedBy)) {
        throw new HttpError(400, "Invalid user ID.");
      }
      baseMatch.userId = new Types.ObjectId(reqQuery.orderedBy);
    }

    // Handle canReturn filter (virtual field based on receivedDate)
    // canReturn = true when: receivedDate is not null AND receivedDate is within return policy window
    if (reqQuery.canReturn) {
      const canReturnFilter = reqQuery.canReturn === "true";
      const now = new Date();
      const minReturnDate = new Date(
        now.getTime() - RETURN_POLICY_DAYS * 24 * 60 * 60 * 1000,
      );

      if (canReturnFilter) {
        // canReturn = true: receivedDate must be within the return window
        baseMatch.receivedDate = {
          $ne: null,
          $gte: minReturnDate,
          $lte: now,
        };
      } else {
        // canReturn = false: either receivedDate is null OR outside return window
        baseMatch.$or = [
          { receivedDate: null },
          { receivedDate: { $lt: minReturnDate } },
        ];
      }
    }

    if (reqQuery.orderDateFrom || reqQuery.orderDateTo) {
      baseMatch.orderDate = {};
      if (reqQuery.orderDateFrom) {
        baseMatch.orderDate.$gte = new Date(reqQuery.orderDateFrom);
      }
      if (reqQuery.orderDateTo) {
        baseMatch.orderDate.$lte = new Date(reqQuery.orderDateTo);
      }
    }

    if (reqQuery.estimateReceivedDateFrom || reqQuery.estimateReceivedDateTo) {
      baseMatch.estimateReceivedDate = {};
      if (reqQuery.estimateReceivedDateFrom) {
        baseMatch.estimateReceivedDate.$gte = new Date(
          reqQuery.estimateReceivedDateFrom,
        );
      }
      if (reqQuery.estimateReceivedDateTo) {
        baseMatch.estimateReceivedDate.$lte = new Date(
          reqQuery.estimateReceivedDateTo,
        );
      }
    }

    if (reqQuery.receivedDateFrom || reqQuery.receivedDateTo) {
      // If canReturn filter was already applied, we need to merge the conditions
      if (!baseMatch.receivedDate) {
        baseMatch.receivedDate = {};
      } else if (baseMatch.$or) {
        // canReturn=false set $or, handle conflict by wrapping in $and
        const canReturnCondition = baseMatch.$or;
        delete baseMatch.$or;

        const receivedDateRange: any = {};
        if (reqQuery.receivedDateFrom) {
          receivedDateRange.$gte = new Date(reqQuery.receivedDateFrom);
        }
        if (reqQuery.receivedDateTo) {
          receivedDateRange.$lte = new Date(reqQuery.receivedDateTo);
        }

        baseMatch.$and = [
          { $or: canReturnCondition },
          { receivedDate: receivedDateRange },
        ];
      }

      // Regular merge if canReturn=true was set
      if (!baseMatch.$and) {
        if (reqQuery.receivedDateFrom) {
          const newGte = new Date(reqQuery.receivedDateFrom);
          if (baseMatch.receivedDate.$gte) {
            baseMatch.receivedDate.$gte = new Date(
              Math.max(baseMatch.receivedDate.$gte.getTime(), newGte.getTime()),
            );
          } else {
            baseMatch.receivedDate.$gte = newGte;
          }
        }

        if (reqQuery.receivedDateTo) {
          const newLte = new Date(reqQuery.receivedDateTo);
          if (baseMatch.receivedDate.$lte) {
            baseMatch.receivedDate.$lte = new Date(
              Math.min(baseMatch.receivedDate.$lte.getTime(), newLte.getTime()),
            );
          } else {
            baseMatch.receivedDate.$lte = newLte;
          }
        }

        // Remove $ne: null if we're explicitly filtering by date range
        if (
          baseMatch.receivedDate.$ne !== undefined &&
          (reqQuery.receivedDateFrom || reqQuery.receivedDateTo)
        ) {
          delete baseMatch.receivedDate.$ne;
        }
      }
    }

    if (reqQuery.createdAtFrom || reqQuery.createdAtTo) {
      baseMatch.createdAt = {};
      if (reqQuery.createdAtFrom) {
        baseMatch.createdAt.$gte = new Date(reqQuery.createdAtFrom);
      }
      if (reqQuery.createdAtTo) {
        baseMatch.createdAt.$lte = new Date(reqQuery.createdAtTo);
      }
    }

    if (reqQuery.updatedAtFrom || reqQuery.updatedAtTo) {
      baseMatch.updatedAt = {};
      if (reqQuery.updatedAtFrom) {
        baseMatch.updatedAt.$gte = new Date(reqQuery.updatedAtFrom);
      }
      if (reqQuery.updatedAtTo) {
        baseMatch.updatedAt.$lte = new Date(reqQuery.updatedAtTo);
      }
    }

    if (reqQuery.deliveryStateIds?.length) {
      const deliveryStateObjIds = reqQuery.deliveryStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid delivery status ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      exprConditions.push({
        $in: [
          { $arrayElemAt: ["$deliveryStates.id", -1] },
          deliveryStateObjIds,
        ],
      });
    }

    if (reqQuery.paymentStateIds?.length) {
      const paymentStateObjIds = reqQuery.paymentStateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid payment status ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      exprConditions.push({
        $in: [{ $arrayElemAt: ["$paymentStates.id", -1] }, paymentStateObjIds],
      });
    }

    if (reqQuery.paymentMethodIds?.length) {
      const paymentMethodObjIds = reqQuery.paymentMethodIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid payment method ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      baseMatch.paymentMethodId = { $in: paymentMethodObjIds };
    }

    if (reqQuery.stateIds?.length) {
      const stateObjIds = reqQuery.stateIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new HttpError(400, `Invalid order status ID: ${id}`);
        }
        return new Types.ObjectId(id);
      });
      exprConditions.push({
        $in: [{ $arrayElemAt: ["$states.id", -1] }, stateObjIds],
      });
    }

    if (exprConditions.length > 0) {
      baseMatch.$expr = { $and: exprConditions };
    }

    let finalQuery: any = baseMatch;
    let total: number;

    if (reqQuery.searchTerm) {
      // product/model/variation name, or order ID
      const searchTerm = reqQuery.searchTerm;
      const searchOrConditions: any[] = [
        { "productDetails.name": { $regex: searchTerm, $options: "i" } },
        { "modelDetails.name": { $regex: searchTerm, $options: "i" } },
        { "variationDetails.name": { $regex: searchTerm, $options: "i" } },
      ];

      // If the searchTerm is a valid ObjectId, also search by order ID first
      if (Types.ObjectId.isValid(searchTerm)) {
        searchOrConditions.push({ _id: new Types.ObjectId(searchTerm) });
      }

      const matchingOrders = await Order.aggregate([
        // 1. Initial filter for the user and other query params
        { $match: baseMatch },
        OPTIMIZE_PIPELINE,
        // 2. Unwind the items array to process each item individually
        { $unwind: "$items" },
        // 3. Lookup variation details
        {
          $lookup: {
            from: "modelvariations",
            localField: "items.variationId",
            foreignField: "_id",
            as: "variationDetails",
          },
        },
        { $unwind: "$variationDetails" },
        // 4. Lookup model details
        {
          $lookup: {
            from: "productmodels",
            localField: "variationDetails.productModelId",
            foreignField: "_id",
            as: "modelDetails",
          },
        },
        { $unwind: "$modelDetails" },
        // 5. Lookup product details
        {
          $lookup: {
            from: "products",
            localField: "modelDetails.productId",
            foreignField: "_id",
            as: "productDetails",
          },
        },
        { $unwind: "$productDetails" },
        { $match: { $or: searchOrConditions } },
        { $group: { _id: "$_id" } },
      ]);

      const orderIds = matchingOrders.map((order) => order._id);

      // If no orders match -> return early
      if (orderIds.length === 0) {
        res.status(200).json({
          success: true,
          message: "No orders found.",
          data: {
            total: 0,
            orders: { total: 0, orders: [] },
            offset,
            limit,
          },
        } as SuccessResponse<OrderListResponse>);
        return;
      }

      finalQuery = { _id: { $in: orderIds } };
      total = orderIds.length;
    } else {
      // If no search term, the total is a simple count
      total = await Order.countDocuments(baseMatch);
    }

    // Fetch the orders using the final query and populate them with sorting
    const orders = await Order.find(finalQuery)
      .sort(sortStage)
      .skip(offset)
      .limit(limit)
      .populate("userId", "_id fullName")
      .populate(populationPath)
      .lean();

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully.",
      data: {
        total,
        orders: {
          total: orders.length,
          orders: orders.map(formatAdminOrderResponse),
        },
        offset,
        limit,
      },
    } as SuccessResponse<AdminOrderListResponse>);
    console.log("✅ ", "Orders retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function fulfillItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fulfilling order item...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or role is missing, this should handled by middleware.",
      ),
    );
  }
  // Check permission
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { orderId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    /*
      Business logic:
        - Can fulfill when order is in "confirmed" state.
        - Go through each item and validate the variationId and instanceIds before assigning.
        - Update isActive for each instanceId.
        - Create inventory movement for each instanceId.
        - Update order: items, fulfilledBy, fulfilledDate, orderState (add "placed" state), if COD add deliveryState (add "processing" state).
        - Since stockQuantity was already deducted during order creation, no need to update again here.
    */

    // Check if order is valid
    const latestOrderStateId = getLatestStateId(order.states);
    const latestOrderStateLookupId = getOrderStateLookupId(latestOrderStateId);
    if (latestOrderStateLookupId !== "2") {
      // confirmed
      throw new HttpError(
        400,
        "Order must be in 'confirmed' state to fulfill items.",
      );
    }

    const { items } = req.body as OrderFulfillItemUpdate;

    const systemUserId = getSysUserId();
    const saleOutMovementTypeId = getMovementTypeId("3");

    for (const { variationId, skus } of items) {
      // Check item exists in order
      const orderItem = order.items.find((oi) =>
        oi.variationId.equals(variationId),
      );
      if (!orderItem) {
        throw new HttpError(404, "Order item not found.");
      }

      if (skus.length !== orderItem.quantity) {
        throw new HttpError(
          400,
          `The number of SKUs provided (${skus.length}) does not match the order item quantity (${orderItem.quantity}).`,
        );
      }

      // Check if all provided skus are valid and available for this variation
      const validSkusCount = await VariationInstance.countDocuments({
        sku: { $in: skus },
        modelVariationId: variationId,
        isActive: true,
      }).session(session);

      if (validSkusCount !== skus.length) {
        throw new HttpError(
          404,
          "One or more provided product instances are invalid, already sold, or do not match the variation.",
        );
      }

      // Fetch the instances to assign based on SKUs
      const instancesToAssign: { _id: Types.ObjectId; sku: string }[] =
        await VariationInstance.find({
          sku: { $in: skus },
          modelVariationId: variationId,
          isActive: true,
        })
          .select("_id sku")
          .lean()
          .session(session);

      // Update order item with the assigned instances
      orderItem.instances = instancesToAssign.map((instance) => ({
        id: instance._id,
        sku: instance.sku,
        state: "ordered",
      }));

      // Update isActive
      await VariationInstance.updateMany(
        { _id: { $in: instancesToAssign.map((i) => i._id) } },
        { $set: { isActive: false, inactiveAt: new Date() } },
        { session },
      );

      // Create inventory movements
      const inventoryMovementsInsert = instancesToAssign.map((instance) => ({
        variationInstanceId: instance._id,
        variationInstanceSku: instance.sku,
        inventoryMovementTypeId: saleOutMovementTypeId,
        createdBy: systemUserId,
        quantity: -1,
        notes: "Order item fulfilled by admin.",
      }));
      await InventoryMovement.insertMany(inventoryMovementsInsert, { session });
    }

    // Update order
    const notes = "Order item(s) fulfilled by admin.";
    const createdBy = new Types.ObjectId(userId);
    order.states.push({
      id: getOrderStateId("3"),
      notes,
      createdBy,
    }); // placed
    order.deliveryStates.push({
      id: getDeliveryStateId("2"),
      notes,
      createdBy,
    }); // processing
    order.fulfilledBy = createdBy;
    order.fulfilledAt = new Date();

    await order.save({ session });
    await order.populate(populationPath);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Order item(s) fulfilled successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
    console.log("✅ ", "Order item(s) fulfilled successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating order...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or role is missing, this should handled by middleware.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { orderId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    await handleOrderUpdate(userId, order, req.body as OrderUpdate, session);

    await order.save({ session });
    await order.populate(populationPath);
    await order.populate("userId", "_id fullName");

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: formatAdminOrderResponse(order),
    } as SuccessResponse<AdminOrderResponse>);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updateBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk updating for orders...");

  const [userId, isBuyerOnly] = [req["auth"]?.userId, req["auth"]?.isBuyerOnly];
  if (!isPresent(userId) || !isPresent(isBuyerOnly)) {
    return next(
      new HttpError(
        500,
        "User ID or role is missing, this should handled by middleware.",
      ),
    );
  }
  if (isBuyerOnly) {
    return next(
      new HttpError(403, "You do not have permission to perform this action."),
    );
  }

  const { orderIds, deliveryStateId, notes, estimateReceivedDate } =
    req.body as OrderUpdateBulk;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (orderIds.length > MAX_ORDERS_TO_UPDATE_BULK) {
      throw new HttpError(
        400,
        `Cannot update more than ${MAX_ORDERS_TO_UPDATE_BULK} orders at once.`,
      );
    }

    const orders = await Order.find({ _id: { $in: orderIds } }).session(
      session,
    );
    if (orders.length !== orderIds.length) {
      throw new HttpError(404, "One or more orders not found.");
    }

    for (const order of orders) {
      await handleOrderUpdate(
        userId,
        order,
        { deliveryStateId, notes, estimateReceivedDate },
        session,
      );
      await order.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Orders updated successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Orders updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
export async function handleOrderDeletion(
  orderToDelete: IOrder,
  session: mongoose.ClientSession,
  { deleteOrderItself = true } = {},
): Promise<void> {
  console.log("▶️ ", `Deleting order ${orderToDelete._id}...`);

  try {
    /*
      Business logic:
        - Restore stockQuantity for variations.
        - If fulfilled order:
          + Restore isActive status for instances.
          + Remove "sales out" inventory movements.
          + If deleting, remove the order document itself.
          + If cancelling, update every instance statuses to "cancelled".
    */

    // 1. Prepare bulk operations to restore stock quantity for variations
    // This is necessary for all cancellations, fulfilled or not.
    const variationStockUpdates = orderToDelete.items.map((item) => ({
      updateOne: {
        filter: { _id: item.variationId },
        update: { $inc: { stockQuantity: item.quantity } },
      },
    }));

    const allInstances = orderToDelete.items.flatMap((item) =>
      item.instances.map((instance) => instance.id),
    );

    // If the order was never fulfilled, it won't have instances.
    // We only need to restore stock and handle the order document.
    if (allInstances.length === 0) {
      await ModelVariation.bulkWrite(variationStockUpdates, { session });
      if (deleteOrderItself) {
        await Order.findByIdAndDelete(orderToDelete._id, { session });
      }
      return;
    }

    // 2. Get the movement type ID for "sales out"
    const saleOutMovementTypeId = getMovementTypeId("3");

    // 3. Execute all updates and deletions in parallel within the transaction
    await Promise.all([
      // Restore stock quantities for all variations
      ModelVariation.bulkWrite(variationStockUpdates, { session }),

      // Set all instances back to active
      // VariationInstance.updateMany(
      //   { _id: { $in: allInstances } },
      //   { $set: { isActive: true } },
      //   { session }
      // ),

      // Remove all related inventory movements
      InventoryMovement.deleteMany(
        {
          variationInstanceId: { $in: allInstances },
          movementTypeId: saleOutMovementTypeId,
          movementDate: { $gte: orderToDelete.createdAt },
        },
        { session },
      ),
    ]);

    // Remove the order itself if specified
    if (deleteOrderItself) {
      await Order.findByIdAndDelete(orderToDelete._id, { session });
    } else {
      // Otherwise update every instanceId.status to "cancelled"
      await Order.updateOne(
        { _id: orderToDelete._id },
        { $set: { "items.$[].instances.$[].status": "cancelled" } },
        { session },
      );
    }

    console.log(
      `✅ `,
      `Order ${orderToDelete._id} and its related data have been successfully deleted.`,
    );
  } catch (error) {
    console.error("❌ ", "Error deleting order:", error);
    throw error;
  }
}

export async function executeCartDeletion(
  userId: Types.ObjectId | string,
  orderItems: { variationId: Types.ObjectId | string; quantity: number }[],
  session: mongoose.ClientSession,
): Promise<void> {
  console.log("▶️ ", `Deleting cart for user ${userId}...`);

  try {
    const carts = await Cart.find({
      userId,
      variationId: { $in: orderItems.map((item) => item.variationId) },
    }).session(session);

    if (carts.length > 0) {
      const bulkOps: any = [];
      for (const orderItem of orderItems) {
        const cartItem = carts.find((ci) =>
          ci.variationId.equals(orderItem.variationId),
        );
        if (!cartItem) continue;

        if (orderItem.quantity >= cartItem.quantity) {
          bulkOps.push({ deleteOne: { filter: { _id: cartItem._id } } });
        } else {
          bulkOps.push({
            updateOne: {
              filter: { _id: cartItem._id },
              update: { $inc: { quantity: -orderItem.quantity } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Cart.bulkWrite(bulkOps, { session });
      }
    }

    console.log(
      `✅ `,
      `Cart for user ${userId} has been successfully deleted.`,
    );
  } catch (error) {
    console.error("❌ ", "Error deleting cart:", error);
    throw error;
  }
}

async function handleOrderUpdate(
  reqUserId: Types.ObjectId | string,
  order: IOrder,
  updateData: OrderUpdate,
  session: mongoose.ClientSession,
): Promise<void> {
  try {
    /*
    Business logic (deliveryStateId, estimateReceivedDate):
      - Can update when order isn't in "completed" or "cancelled" states.
      - estimatedReceivedDate must be greater than order.createdAt.
      - deliveryState can only be updated forward, not backward.

      - For COD orders:
        - deliveryState changed to:
          + "shipped", "in transit", "out for delivery":
            -> orderStates: add "delivering" state.
          + "delivered":
            -> receivedDate will be set to now.
            -> paymentStates: add "paid" state.
            -> orderStates: add "delivered" state.
            -> order.receivedDate = now.
          + "delivery failed":
            -> latest deliveryState must be at "out for delivery".
          + "delivery rescheduled":
            -> latest deliveryState must be at "delivery failed".
          + "cancelled":
            -> deliveryStates has a least one "delivery failed" state.
            -> handleOrderDeletion(order, session, { deleteOrderItself: false });
            -> orderStates: add "cancelled" state.
            -> refund userBalanceCents if has.
      - For non-COD orders:
        - deliveryState changed to:
          + "shipped", "in transit", "out for delivery":
            -> orderStates: add "delivering" state.
          + "delivered":
            -> receivedDate will be set to now.
            -> orderStates: add "delivered" state.
            -> order.receivedDate = now.
          + "delivery failed":
            -> latest deliveryState must be at "out for delivery".
          + "delivery rescheduled":
            -> latest deliveryState must be at "delivery failed".
          + "cancelled":
            -> deliveryStates has a least one "delivery failed" state.
            -> handleOrderDeletion(order, session, { deleteOrderItself: false });
            -> orderStates: add "cancelled" state.
            -> paymentStatuses: add "refunded via Stripe/refunded to balance" state.
            -> refund: handleCancelRefund().
    */

    // Check if order is completed - level 6 -> can't be updated anymore
    const latestOrderStateId = getLatestStateId(order.states);
    const latestOrderStateLevel = getOrderStateLevel(latestOrderStateId);
    if (latestOrderStateLevel === 6) {
      // completed or cancelled
      throw new HttpError(
        400,
        "Order cannot be updated after it has been completed or cancelled.",
      );
    }

    const { deliveryStateId, estimateReceivedDate, notes } = updateData;

    // Update deliveryStateId
    const latestDeliveryStateId = getLatestStateId(order.deliveryStates);
    if (
      deliveryStateId &&
      deliveryStateId !== latestDeliveryStateId.toString()
    ) {
      // Check exists
      if (!Types.ObjectId.isValid(deliveryStateId)) {
        throw new HttpError(404, "Delivery state not found.");
      }
      const deliveryStateLevel = getDeliveryStateLevel(
        new Types.ObjectId(deliveryStateId),
      );

      // Can't update deliveryStateId if non-COD order isn't paid yet
      const latestPaymentStateId = getLatestStateId(order.paymentStates);
      const isPaid = getPaymentStateLookupId(latestPaymentStateId) === "2";
      const isCOD =
        getPaymentMethodLookupId(new Types.ObjectId(order.paymentMethodId)) ===
        "1";
      if (!isCOD && !isPaid) {
        throw new HttpError(
          400,
          "Cannot update delivery state for non-COD orders that haven't been paid yet.",
        );
      }

      const deliveryStateLookupId = getDeliveryStateLookupId(
        new Types.ObjectId(deliveryStateId),
      );
      const latestDeliveryStateLookupId = getDeliveryStateLookupId(
        latestDeliveryStateId,
      );

      // Handle special case: update from "delivery failed" to "delivery rescheduled"
      if (deliveryStateLookupId === "8") {
        // delivery rescheduled
        if (latestDeliveryStateLookupId !== "7") {
          throw new HttpError(
            400,
            "Latest delivery state must be 'delivery failed' to update to 'delivery rescheduled'.",
          );
        }
      } else {
        // Can only be updated forward
        if (
          deliveryStateLevel <= getDeliveryStateLevel(latestDeliveryStateId)
        ) {
          throw new HttpError(
            400,
            "Delivery state can only be updated forward, not backward.",
          );
        }

        // --- Trigger Consequential State Updates ---
        const sysUserId = getSysUserId();
        switch (deliveryStateLevel) {
          case 3: // shipped
          case 4: // in transit
          // out for delivery
          case 5: {
            // Check if the latest order state is already 'delivering' before adding it again.
            const latestOrderStateLookupId =
              getOrderStateLookupId(latestOrderStateId);
            if (latestOrderStateLookupId === "3") {
              // placed
              order.states.push({
                id: getOrderStateId("4"),
                notes:
                  "Auto updated to 'delivering' due to delivery state change.",
                createdBy: sysUserId,
              }); // delivering
            }
            break;
          }
          // delivered
          case 6: {
            order.receivedDate = new Date();
            order.states.push({
              id: getOrderStateId("5"), // delivered
              notes:
                "Auto updated to 'delivered' due to delivery state change.",
              createdBy: sysUserId,
            });
            if (isCOD) {
              order.paymentStates.push({
                id: getPaymentStateId("2"), // paid
                notes: "Payment collected upon delivery (COD).",
                createdBy: new Types.ObjectId(reqUserId),
              });
            }
            break;
          }
          // delivery failed
          case 7: {
            if (latestDeliveryStateLookupId !== "5") {
              // out for delivery
              throw new HttpError(
                400,
                "Latest delivery state must be 'out for delivery' to update to 'delivery failed'.",
              );
            }
            break;
          }
          // cancelled
          case 9: {
            if (
              !order.deliveryStates.some(
                (ds) => getDeliveryStateLookupId(ds.id) === "7",
              )
            ) {
              // delivery failed
              throw new HttpError(
                400,
                "Order can only be cancelled if it has at least one 'delivery failed' state.",
              );
            }

            await handleOrderDeletion(order, session, {
              deleteOrderItself: false,
            });
            order.states.push({
              id: getOrderStateId("7"), // cancelled
              notes: "Order cancelled by admin after failed delivery attempt.",
              createdBy: sysUserId,
            });

            // Handle refund logic
            if (isCOD && order.paymentSummary.appliedBalanceCents > 0) {
              // Refund to user balance
              await User.findByIdAndUpdate(
                order.userId,
                {
                  $inc: {
                    userBalanceCents: order.paymentSummary.appliedBalanceCents,
                  },
                },
                { session },
              );
              order.paymentStates.push({
                id: getPaymentStateId("5"),
                notes: "Refunded to user balance due to order cancellation.",
                createdBy: sysUserId,
              }); // refunded to balance
            }
            if (!isCOD) {
              order.paymentStates.push({
                id: getPaymentStateId("4"),
                notes: "Refunded via Stripe due to order cancellation.",
                createdBy: sysUserId,
              });
              await handleCancelRefund(order, session); // Auto handle refunded to balance if needed
            }
          }
        }
      }

      // Push new delivery state
      order.deliveryStates.push({
        id: new Types.ObjectId(deliveryStateId),
        notes: notes || null,
        createdBy: new Types.ObjectId(reqUserId),
      });
    }

    // Update estimateReceivedDate
    if (estimateReceivedDate) {
      const updatedEstimateReceivedDate = new Date(estimateReceivedDate);
      if (updatedEstimateReceivedDate <= order.createdAt) {
        throw new HttpError(
          400,
          "Estimated received date must be greater than order created date.",
        );
      }
      if (updatedEstimateReceivedDate < new Date()) {
        throw new HttpError(
          400,
          "Estimated received date must be in the future.",
        );
      }
      order.estimateReceivedDate = updatedEstimateReceivedDate;
    }
  } catch (error) {
    console.error("❌ ", "Error updating order:", error);
    throw error;
  }
}

// Handle refund, add paymentStates and update user.userBalanceCents if needed
async function handleCancelRefund(
  order: IOrder,
  session: mongoose.ClientSession,
): Promise<void> {
  console.log("▶️ ", `Executing refund for order ${order._id}...`);

  try {
    const user = await User.findById(order.userId).session(session);
    if (!user) {
      throw new HttpError(404, "User not found for refund.");
    }

    // If finalAmountCents is 0 -> check appliedBalanceCents to restore -> return
    const { appliedBalanceCents, finalAmountCents: amountToRefund } =
      order.paymentSummary;
    if (amountToRefund <= 0) {
      // If user paid all with balance -> restore.
      if (appliedBalanceCents > 0) {
        user.userBalanceCents += appliedBalanceCents;
        await user.save({ session });
        console.log(
          `✅ `,
          `Restored ${appliedBalanceCents} cents to user ${user._id} balance.`,
        );
      }
      console.log(
        `✅ `,
        `No monetary refund needed for order ${order._id}. Process completed.`,
      );
      return;
    }

    // If order has a transaction and user has a stripeCustomerId -> refund via Stripe
    if (order.transaction?.paymentIntentId && user.stripeCustomerId) {
      try {
        await createRefund(order.transaction.paymentIntentId, amountToRefund);
        console.log(
          `✅ `,
          `Successfully refunded ${amountToRefund} cents for order ${order._id} via Stripe.`,
        );
      } catch (stripeError) {
        console.error(
          "❌ ",
          `Stripe refund failed for order ${order._id}. Refunding to user balance as a fallback.`,
          stripeError,
        );

        const sysUserId = getSysUserId();

        order.paymentStates.push({
          id: getPaymentStateId("6"),
          notes: "Refund via Stripe failed, refunded to user balance instead.",
          createdBy: sysUserId,
        }); // refund via Stripe failed
        user.userBalanceCents += amountToRefund;
        order.paymentStates.push({
          id: getPaymentStateId("5"),
          notes: "Refunded to user balance due to Stripe refund failure.",
          createdBy: sysUserId,
        }); // refunded to balance
      }
    } else {
      // Fallback to user balance if no Stripe transaction or customer ID
      console.log(
        `Refunding to user balance for order ${order._id} as no Stripe transaction or customer ID found.`,
      );
      user.userBalanceCents += amountToRefund;
      order.paymentStates.push({
        id: getPaymentStateId("5"),
        notes:
          "Refunded to user balance due to missing Stripe transaction or customer ID.",
        createdBy: getSysUserId(),
      }); // refunded to balance
    }

    // Restore user balance if has
    if (appliedBalanceCents > 0) {
      user.userBalanceCents += appliedBalanceCents;
      console.log(
        `✅ `,
        `Restored ${appliedBalanceCents} cents to user ${user._id} balance.`,
      );
    }

    await user.save({ session });
    console.log(`✅ `, `Refund process completed for order ${order._id}.`);
  } catch (error) {
    console.error(
      "❌ ",
      `Error executing refund for order ${order._id}:`,
      error,
    );
    throw error;
  }
}

// Define the population path to be reused
export const populationPath = {
  path: "items.variation",
  populate: {
    path: "productModel",
    populate: {
      path: "product",
      select: "_id name stopSelling isDeleted",
    },
    select: "_id name priceCents stopSelling isDeleted product productId",
  },
  select:
    "_id name color imageUrls additionalPriceCents stockQuantity stopSelling isDeleted productModel productModelId",
};
