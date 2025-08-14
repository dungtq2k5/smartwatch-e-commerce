import { Request, Response, NextFunction } from "express";
import {
  OrderCreate,
  OrderResponse,
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
} from "../../utils/utils";
import Order from "../../models/order/order.model";
import { ESTIMATE_RECEIVED_DATE } from "../../../common/configs.common";
import { appCache } from "../../configs/cache";
import DeliveryState from "../../models/order/deliveryState.model";
import PaymentMethod from "../../models/order/paymentMethod.model";

// TODO handle when pay by COD, user balance...

// --- BOTH BUYER AND ADMIN FUNCTIONS ---
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating order...");
  const userId = (req["auth"] as RequestAuth).userId;
  const { userAddressId, items, paymentMethodId } = req.body as OrderCreate;

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
        6. Remove items from cart if has.
        7. Create order.
    */

    // Check if there is an existing order with the same userId and paymentStatusId is "pending"
    const paymentStatusPendingStateId = getPaymentStatusId("pending");
    const existingPendingOrder = await Order.findOne({
      userId,
      paymentStatusId: paymentStatusPendingStateId,
    }).session(session);
    if (existingPendingOrder) {
      // Remove the existing pending order
      await executeOrderDeletion(existingPendingOrder, session);
    }

    // Check items exist and available and init data for order creation
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
      notes: "User placed an order(checkout) but not yet paid.";
    }[] = [];
    const movementTypeId = getMovementTypeId("pending order");
    const createdBy = appCache.systemUserId;
    if (!createdBy) {
      throw new HttpError(500, "System user not found in cache.");
    }

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
          movementTypeId, // sales out
          createdBy, // system user
          quantity: -1,
          notes: "User placed an order(checkout) but not yet paid.",
        });
      }
      await InventoryMovement.insertMany(inventoryMovementsInsert, { session });
    }

    /*
      Create order:
        - paymentMethodId is COD: paymentStatus - pending, deliveryState - order placed, orderDate - now.
        - paymentMethodId is non-COD: paymentStatus - pending, deliveryState - null.
    */
    const order = new Order({
      userId,
      items: orderItemsInsert,
      totalCents: orderItemsInsert.reduce(
        (sum, item) => sum + item.totalCents,
        0
      ),
      paymentStatusId: paymentStatusPendingStateId,
      estimateReceivedDate: new Date(Date.now() + ESTIMATE_RECEIVED_DATE),
      deliveryAddress: address,
      paymentMethodId,
    });

    if (paymentMethod.name === "cash") {
      order.deliveryStateId = getDeliveryStateId("order placed");
      order.orderDate = new Date();
    }

    await order.save({ session });

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

export async function get(
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
    const order = await Order.findById(id).lean();
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check permission
    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (order.userId.toString() !== userId && isBuyerOnly) {
      throw new HttpError(403, "You do not have permission to view this order.");
    }

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
            + "cancelled": executeOrderDeletion(order, session, { deleteOrderItself: false });, paymentStatusId will be updated to "cancelled", // TODO handle refund for non-COD orders.
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
            + "cancelled": executeOrderDeletion(order, session, { deleteOrderItself: false });, paymentStatusId will be updated to "cancelled", // TODO handle refund for non-COD orders.
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
    const pendingOrderMovementTypeId = getMovementTypeId("pending order");

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
          movementTypeId: pendingOrderMovementTypeId,
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
    throw new Error(error);
  }
}
