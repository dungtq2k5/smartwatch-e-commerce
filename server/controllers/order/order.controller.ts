import { Request, Response, NextFunction } from "express";
import {
  OrderCreate,
  OrderListResponse,
  OrderResponse,
  OrderSearchQuery,
  OrderUpdate,
  OrderUpdateSelf,
  SuccessResponse,
} from "../../../common/types.common";
import { HttpError } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import UserAddress from "../../models/user/userAddress.model";
import { RequestAuth } from "../../utils/types";
import ModelVariation from "../../models/product/modelVariation.model";
import VariationInstance from "../../models/product/variationInstance.model";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import {
  compareAddress,
  formatOrderResponse,
  getDeliveryStateId,
  getDeliveryStateLevel,
  getMovementTypeId,
  getPaymentMethodName,
  getPaymentStatusId,
  getPaymentStatusName,
  getSysUserId,
} from "../../utils/utils";
import Order from "../../models/order/order.model";
import { ESTIMATE_RECEIVED_DATE } from "../../../common/configs.common";
import DeliveryState from "../../models/order/deliveryState.model";
import PaymentMethod from "../../models/order/paymentMethod.model";
import Cart from "../../models/user/cart.model";
import User from "../../models/user/user.model";

// TODO if user doesn't have stripeCustomerId but refund -> refund to their userBalanceCents.
// TODO remember update inventory too when refund.

// --- BOTH BUYER AND ADMIN FUNCTIONS ---
export async function createSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating order...");
  const userId = (req["auth"] as RequestAuth).userId;
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
    const paymentMethod = await PaymentMethod.findById(paymentMethodId)
      .lean()
      .session(session);
    if (!paymentMethod) {
      throw new HttpError(404, "Payment method not found.");
    }

    /*
      Business logic:
        1. Check if there is also an order with the same userId and paymentStatusId is "pending"
          -> remove it first (make sure there is always maximum one order is pending for each user).
        2. Check available items.
        3. Update each variation stock.
        4. Update each instance state.
        5. Create InventoryMovement for each instance.
        6. Remove all items from cart if has + COD order.
        7. Create order.
    */

    // Check if there is an existing non-COD order with the same userId and paymentStatusId is "pending"
    const pendingPaymentStatusId = getPaymentStatusId("pending");
    const isCOD = paymentMethod.name === "cash";

    if (!isCOD) {
      const existingPendingOrder = await Order.findOne({
        userId,
        paymentStatusId: pendingPaymentStatusId,
      }).session(session);
      if (existingPendingOrder) {
        // Remove the existing pending order
        await executeOrderDeletion(existingPendingOrder, session);
      }
    }

    // Check items exist and available and init data for order creation
    const systemUserId = getSysUserId();
    const orderItemsInsert: {
      variationId: Types.ObjectId | string;
      quantity: number;
      totalCents: number;
      instanceIds: { id: Types.ObjectId | string; sku: string }[];
    }[] = [];
    const inventoryMovementsInsert: {
      variationInstanceId: Types.ObjectId | string;
      sku: string;
      movementTypeId: Types.ObjectId | string;
      createdBy: Types.ObjectId | string;
      quantity: -1;
      notes: "User placed an order(checkout).";
    }[] = [];
    const saleOutMovementTypeId = getMovementTypeId("sales out");

    for (const { variationId, quantity } of items) {
      if (!Types.ObjectId.isValid(variationId)) {
        throw new HttpError(404, "Variation not found.");
      }

      const populatedVariation = await ModelVariation.findOne({
        isDeleted: false,
        _id: variationId,
        stockQuantity: { $gte: quantity },
        stopSelling: false,
      })
        .populate({
          path: "productModelId",
          select: "priceCents stopSelling isDeleted",
          populate: {
            path: "productId",
            select: "stopSelling isDeleted",
          },
        })
        .session(session);

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

      const instances = await VariationInstance.find({
        isActive: true,
        modelVariationId: variationId,
      })
        .limit(quantity)
        .lean()
        .session(session);
      if (instances.length < quantity) {
        throw new HttpError(404, "Not enough variation instances available.");
      }

      orderItemsInsert.push({
        variationId,
        quantity,
        totalCents:
          (model.priceCents + variation.additionalPriceCents) * quantity,
        instanceIds: instances.map((instance) => ({
          id: instance._id,
          sku: instance.sku,
        })),
      });

      // Update variation quantity
      variation.stockQuantity! -= quantity;
      await variation.save({ session });

      // Update instance isActive to false
      await VariationInstance.updateMany(
        { _id: { $in: instances.map((instance) => instance._id) } },
        { $set: { isActive: false } },
        { session }
      );

      // Create inventory movement
      for (const instance of instances) {
        inventoryMovementsInsert.push({
          variationInstanceId: instance._id,
          sku: instance.sku,
          movementTypeId: saleOutMovementTypeId,
          createdBy: systemUserId,
          quantity: -1,
          notes: "User placed an order(checkout).",
        });
      }
      await InventoryMovement.insertMany(inventoryMovementsInsert, { session });
    }

    // Calculating total cents
    const user = req["user"]; // Form middleware
    const subtotalCents = orderItemsInsert.reduce(
      (sum, item) => sum + item.totalCents,
      0
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
        { session }
      );
    }

    /*
      Create order:
        - paymentMethodId is COD: paymentStatus - pending, deliveryState - order placed, orderDate - now, delete user's cart
        - paymentMethodId is non-COD: paymentStatus - pending, deliveryState - null, delete user's cart will be handled in the webhook after successful payment.
    */
    const order = new Order({
      userId,
      items: orderItemsInsert,
      paymentSummary: {
        subtotalCents,
        appliedBalanceCents,
        finalAmountCents,
      },
      paymentStatusId: pendingPaymentStatusId,
      estimateReceivedDate: new Date(Date.now() + ESTIMATE_RECEIVED_DATE),
      deliveryAddress: address,
      paymentMethodId,
    });

    if (isCOD) {
      order.deliveryStateId = getDeliveryStateId("order placed");
      order.orderDate = new Date();
      await executeCartDeletion(userId, items, session);
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
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Getting order by ID...");
  const { id } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(id);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (order.userId.toString() !== userId && isBuyerOnly) {
      throw new HttpError(
        403,
        "You do not have permission to view this order."
      );
    }

    await order.populate(populationPath);

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
    console.log("✅ ", "Order retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function searchSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Searching self orders...");
  const { userId } = req["auth"] as RequestAuth;
  const reqQuery = req.query as OrderSearchQuery;

  const limit = reqQuery.limit ? parseInt(reqQuery.limit) : 9;
  const offset = reqQuery.offset ? parseInt(reqQuery.offset) : 0;
  const baseMatch: any = { userId: new Types.ObjectId(userId) };

  if (reqQuery.deliveryStateId) {
    if (!Types.ObjectId.isValid(reqQuery.deliveryStateId)) {
      throw new HttpError(400, "Invalid delivery state ID.");
    }
    baseMatch.deliveryStateId = new Types.ObjectId(reqQuery.deliveryStateId);
  }

  if (reqQuery.paymentStatusId) {
    if (!Types.ObjectId.isValid(reqQuery.paymentStatusId)) {
      throw new HttpError(400, "Invalid payment status ID.");
    }
    baseMatch.paymentStatusId = new Types.ObjectId(reqQuery.paymentStatusId);
  }

  try {
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
      .populate(populationPath); // Via virtual

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
  } catch (error) {
    next(error);
  }
}

export async function updateSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating self order...");
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(id).session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (isBuyerOnly && order.userId.toString() !== userId) {
      throw new HttpError(
        403,
        "You do not have permission to update this order."
      );
    }

    /*
      Business logic (deliveryStateId, deliveryAddressId):
        - Can update when order isn't in "received", "returned", or "cancelled" state (level 7).
        - Can change deliveryAddress when deliveryStateId is before "shipped".
        - Can change deliveryStateId to "received" or "returned" when deliveryStateId is "delivered".
        - Can change deliveryStateId to "cancelled" when deliveryStateId is before "shipped".

        - For COD orders:
          - deliveryState changed to:
            + "cancelled": executeOrderDeletion(order, session, { deleteOrderItself: false });, paymentStatusId will be updated to "cancelled".
            + "returned": // TODO further refund logic.
        - For non-COD orders:
          - deliveryState changed to:
            + "cancelled": executeOrderDeletion(order, session, { deleteOrderItself: false });, paymentStatusId will be updated to "cancelled", // TODO handle refund.
            + "returned": // TODO further refund logic.
    */

    // Check if order is completed, can't be updated anymore
    if (
      order.deliveryStateId &&
      getDeliveryStateLevel(order.deliveryStateId) === 7 // completed is level 7
    ) {
      throw new HttpError(
        400,
        "Order cannot be updated after it has been received, cancelled, or returned."
      );
    }

    const { deliveryStateId, deliveryAddressId } = req.body as OrderUpdateSelf;

    // Update deliveryStateId
    if (
      deliveryStateId &&
      deliveryStateId !== order.deliveryStateId?.toString()
    ) {
      // Can't update deliveryStateId if non-COD order is in pending state
      const isCOD = getPaymentMethodName(order.paymentMethodId) === "cash";
      if (!isCOD && getPaymentStatusName(order.paymentStatusId) === "pending") {
        throw new HttpError(
          400,
          "Cannot update delivery state for pending non-COD orders."
        );
      }

      // Check exists
      if (!Types.ObjectId.isValid(deliveryStateId)) {
        throw new HttpError(404, "Delivery state not found.");
      }
      const deliveryState = await DeliveryState.findById(deliveryStateId)
        .lean()
        .session(session);
      if (!deliveryState) {
        throw new HttpError(404, "Delivery state not found.");
      }

      // Check logic and auto update paymentStatusId
      switch (deliveryState.name) {
        case "received":
        case "returned": {
          if (
            !order.deliveryStateId ||
            !order.deliveryStateId.equals(getDeliveryStateId("delivered"))
          ) {
            throw new HttpError(
              400,
              "Order must be in 'delivered' state to update to 'received' or 'returned'."
            );
          }
          break;
        }
        case "cancelled": {
          if (
            order.deliveryStateId &&
            getDeliveryStateLevel(order.deliveryStateId) >= 4 // "shipped" is level 4
          ) {
            throw new HttpError(
              400,
              "Order can only be cancelled before it is shipped."
            );
          }

          order.paymentStatusId = getPaymentStatusId("cancelled");
          await executeOrderDeletion(order, session, {
            deleteOrderItself: false,
          });
          if (!isCOD) {
            // Handle refund since buyer paid via non-COD method
          }
          break;
        }
        default: {
          throw new HttpError(
            403,
            "You do not have permission to update delivery state."
          );
        }
      }

      order.deliveryStateId = deliveryState._id;
    }

    // Update deliveryStateId
    if (deliveryAddressId) {
      // Check address exists
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

      // Check if delivery state is before "shipped"
      if (
        order.deliveryStateId &&
        !compareAddress(address, order.deliveryAddress) &&
        getDeliveryStateLevel(order.deliveryStateId) >= 4 // "shipped" is level 4
      ) {
        throw new HttpError(
          400,
          "Delivery address can only be updated before the order is shipped."
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
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating order...");
  const { id } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(id).session(session);
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    const { isBuyerOnly } = req["auth"] as RequestAuth;
    if (isBuyerOnly) {
      throw new HttpError(
        403,
        "You do not have permission to update this order."
      );
    }

    /*
      Business logic (deliveryStateId, deliveryAddressId, estimateReceivedDate):
        - Can update when order isn't in "received", "returned", or "cancelled" state (level 7).
        - Can change deliveryAddress when deliveryStateId is before "shipped" (level 4).
        - Can change deliveryStateId to "received" or "returned" when deliveryStateId is "delivered".
        - Can change deliveryStateId to "cancelled" when deliveryStateId is before "shipped".
        - estimatedReceivedDate must be greater than order.createdAt.
        - deliveryState can only be updated forward, not backward.

        - For COD orders:
          - deliveryState changed to:
            + "delivered": paymentStatusId will be updated to "paid", receivedDate will be set to now.
            + "cancelled": executeOrderDeletion(order, session, { deleteOrderItself: false });, paymentStatusId will be updated to "cancelled".
            + "returned": // TODO further refund logic, if user haven't have bank account -> refund to userBalance.
        - For non-COD orders:
          - deliveryState changed to:
            + "delivered": receivedDate will be set to now.
            + "cancelled": executeOrderDeletion(order, session, { deleteOrderItself: false });, paymentStatusId will be updated to "cancelled", // TODO handle refund.
            + "returned": // TODO further refund logic.
    */

    if (
      order.deliveryStateId &&
      getDeliveryStateLevel(order.deliveryStateId) === 7 // completed is level 7
    ) {
      throw new HttpError(
        400,
        "Order cannot be updated after it has been received, cancelled, or returned."
      );
    }

    const { deliveryStateId, deliveryAddressId, estimateReceivedDate } =
      req.body as OrderUpdate;

    // Update deliveryStateId
    if (
      deliveryStateId &&
      deliveryStateId !== order.deliveryStateId?.toString()
    ) {
      // Can't update deliveryStateId if non-COD order is in pending state
      const isCOD = getPaymentMethodName(order.paymentMethodId) === "cash";
      if (!isCOD && getPaymentStatusName(order.paymentStatusId) === "pending") {
        throw new HttpError(
          400,
          "Cannot update delivery state for pending non-COD orders."
        );
      }

      // Check exists
      if (!Types.ObjectId.isValid(deliveryStateId)) {
        throw new HttpError(404, "Delivery state not found.");
      }
      const deliveryState = await DeliveryState.findById(deliveryStateId)
        .lean()
        .session(session);
      if (!deliveryState) {
        throw new HttpError(404, "Delivery state not found.");
      }

      // Can only be updated forward
      if (
        order.deliveryStateId &&
        getDeliveryStateLevel(new Types.ObjectId(deliveryStateId)) <
          getDeliveryStateLevel(order.deliveryStateId)
      ) {
        throw new HttpError(
          400,
          "Delivery state can only be updated forward, not backward."
        );
      }

      // Check logic and auto update paymentStatusId
      switch (deliveryState.name) {
        case "received":
        case "returned": {
          if (
            !order.deliveryStateId ||
            !order.deliveryStateId.equals(getDeliveryStateId("delivered"))
          ) {
            throw new HttpError(
              400,
              "Order must be in 'delivered' state to update to 'received' or 'returned'."
            );
          }
          break;
        }
        case "cancelled": {
          if (
            order.deliveryStateId &&
            getDeliveryStateLevel(order.deliveryStateId) >= 4 // "shipped" is level 4
          ) {
            throw new HttpError(
              400,
              "Order can only be cancelled before it is shipped."
            );
          }

          order.paymentStatusId = getPaymentStatusId("cancelled");
          await executeOrderDeletion(order, session, {
            deleteOrderItself: false,
          });
          if (!isCOD) {
            // Handle refund since buyer paid via non-COD method
          }
          break;
        }
        case "delivered": {
          order.receivedDate = new Date();
          if (isCOD) {
            order.paymentStatusId = getPaymentStatusId("paid");
          }
          break;
        }
      }

      order.deliveryStateId = deliveryState._id;
    }

    // Update deliveryAddressId
    if (deliveryAddressId) {
      // Check address exists
      if (!Types.ObjectId.isValid(deliveryAddressId)) {
        throw new HttpError(404, "Delivery address not found.");
      }
      const address = await UserAddress.findOne({
        _id: deliveryAddressId,
        userId: order.userId,
      })
        .lean()
        .session(session);
      if (!address) {
        throw new HttpError(404, "Delivery address not found.");
      }

      // Check if delivery state is before "shipped"
      if (
        order.deliveryStateId &&
        !compareAddress(address, order.deliveryAddress) &&
        getDeliveryStateLevel(order.deliveryStateId) >= 4 // "shipped" is level 4
      ) {
        throw new HttpError(
          400,
          "Delivery address can only be updated before the order is shipped."
        );
      }

      order.deliveryAddress = address;
    }

    // Update estimateReceivedDate
    if (estimateReceivedDate) {
      const updatedEstimateReceivedDate = new Date(estimateReceivedDate);
      if (updatedEstimateReceivedDate <= order.createdAt) {
        throw new HttpError(
          400,
          "Estimated received date must be greater than order created date."
        );
      }
      order.estimateReceivedDate = updatedEstimateReceivedDate;
    }

    await order.save({ session });
    await order.populate(populationPath);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
// This function was created to handle the deletion of a pending order and its related data
// If use this function for other purposes, please make sure to adjust the logic accordingly
export async function executeOrderDeletion(
  orderToDelete: any,
  session: mongoose.ClientSession,
  options: { deleteOrderItself: boolean } = { deleteOrderItself: true }
): Promise<void> {
  console.log("▶️ ", `Deleting order ${orderToDelete._id}...`);

  try {
    /**
      Business logic:
        - Restore stockQuantity for variations.
        - Restore isActive status for instances.
        - Remove "pending order" inventory movements.
        - Remove the order document itself.
    */

    const allInstanceIds = orderToDelete.items.flatMap((item: any) =>
      item.instanceIds.map((instance: any) => instance.id)
    );
    if (allInstanceIds.length === 0) {
      console.warn(
        `Order ${orderToDelete._id} has no instances to restore. Deleting order only.`
      );
      await Order.deleteOne({ _id: orderToDelete._id }, { session });
      return;
    }

    // 1. Prepare bulk operations to restore stock quantity for variations
    const variationStockUpdates = orderToDelete.items.map((item: any) => ({
      updateOne: {
        filter: { _id: item.variationId },
        update: { $inc: { stockQuantity: item.quantity } },
      },
    }));

    // 2. Get the movement type ID for "pending order"
    const saleOutMovementTypeId = getMovementTypeId("sales out");

    // 3. Execute all updates and deletions in parallel within the transaction
    await Promise.all([
      // Restore stock quantities for all variations
      ModelVariation.bulkWrite(variationStockUpdates, { session }),

      // Set all instances back to active
      VariationInstance.updateMany(
        { _id: { $in: allInstanceIds } },
        { $set: { isActive: true } },
        { session }
      ),

      // Remove all related inventory movements
      InventoryMovement.deleteMany(
        {
          variationInstanceId: { $in: allInstanceIds },
          movementTypeId: saleOutMovementTypeId,
          movementDate: { $gte: orderToDelete.createdAt },
        },
        { session }
      ),
    ]);

    // Finally, remove the order itself
    if (options.deleteOrderItself) {
      await Order.deleteOne({ _id: orderToDelete._id }, { session });
    }

    console.log(
      `✅ `,
      `Order ${orderToDelete._id} and its related data have been successfully deleted.`
    );
  } catch (error) {
    console.error("❌ ", "Error deleting order:", error);
    throw error;
  }
}

export async function executeCartDeletion(
  userId: Types.ObjectId | string,
  orderItems: { variationId: Types.ObjectId | string; quantity: number }[],
  session: mongoose.ClientSession
): Promise<void> {
  console.log("▶️ ", `Deleting cart for user ${userId}...`);

  try {
    const carts = await Cart.find({
      userId,
      variationId: { $in: orderItems.map((item) => item.variationId) },
    }).session(session);

    if (carts.length > 0) {
      const bulkOps = orderItems
        .map((orderItem) => {
          const cartItem = carts.find((ci) =>
            ci.variationId.equals(orderItem.variationId)
          );

          if (!cartItem) return [];

          if (orderItem.quantity >= cartItem.quantity!) {
            return [{ deleteOne: { filter: { _id: cartItem._id } } }];
          }

          return [
            {
              updateOne: {
                filter: { _id: cartItem._id },
                update: { $inc: { quantity: -orderItem.quantity } },
              },
            },
          ];
        })
        .flat();

      if (bulkOps.length > 0) {
        await Cart.bulkWrite(bulkOps, { session });
      }
    }

    console.log(
      `✅ `,
      `Cart for user ${userId} has been successfully deleted.`
    );
  } catch (error) {
    console.error("❌ ", "Error deleting cart:", error);
    throw error;
  }
}

// Define the population path to be reused
const populationPath = {
  path: "items.variation",
  populate: {
    path: "productModel",
    populate: {
      path: "product",
      select: "_id name",
    },
    select: "_id name priceCents product productId",
  },
  select:
    "_id name color imageUrls additionalPriceCents stockQuantity productModel productModelId",
};
