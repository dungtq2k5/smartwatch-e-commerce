import { Request, Response, NextFunction } from "express";
import {
  OrderCreate,
  OrderResponse,
  OrderUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { errorHandler } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import UserAddress from "../../models/user/userAddress.model";
import { RequestAuth } from "../../utils/types";
import ModelVariation from "../../models/product/modelVariation.model";
import VariationInstance from "../../models/product/variationInstance.model";
import InventoryMovement from "../../models/inventory/inventoryMovement.model";
import Cart from "../../models/user/cart.model";
import {
  compareAddress,
  formatOrderResponse,
  getDeliveryStateId,
  getDeliveryStateLevel,
  getMovementTypeId,
} from "../../utils/utils";
import Order from "../../models/order/order.model";
import { ESTIMATE_RECEIVED_DATE } from "../../../common/configs.common";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating order...");
  const { userAddressId, items } = req.body as OrderCreate;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check address exists
    if (!Types.ObjectId.isValid(userAddressId)) {
      return next(errorHandler(404, "User address not found."));
    }
    const userId = (req["auth"] as RequestAuth).userId;
    const address = await UserAddress.findOne({
      _id: userAddressId,
      userId,
    })
      .lean()
      .session(session);
    if (!address) {
      return next(errorHandler(404, "User address not found."));
    }

    /*
      Business logic:
        1. Check available.
        2. Update each variation stock.
        3. Update each instance state.
        4. Create InventoryMovement for each instance.
        5. Remove items from cart if has.
        6. Create order.
    */
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
      notes: "Sales out by ordering";
    }[] = [];
    const movementTypeId = getMovementTypeId("sales out");

    for (const { variationId, quantity } of items) {
      if (!Types.ObjectId.isValid(variationId)) {
        return next(errorHandler(404, "Variation not found."));
      }

      const variation = await ModelVariation.findOne({
        isDeleted: false,
        _id: variationId,
        stockQuantity: { $gte: quantity },
        stopSelling: false,
      })
        .populate({
          path: "productModelId",
          select: "priceCents",
        })
        .session(session);

      if (!variation) {
        return next(errorHandler(404, "Variation not found or out of stock."));
      }

      const instances = await VariationInstance.find({
        isActive: true,
        modelVariationId: variationId,
      })
        .limit(quantity)
        .lean()
        .session(session);
      if (instances.length < quantity) {
        return next(
          errorHandler(404, "Not enough variation instances available.")
        );
      }

      const productModel = variation.productModelId as any;

      orderItemsInsert.push({
        variationId,
        quantity,
        totalCents:
          (productModel.priceCents + variation.additionalPriceCents) * quantity,
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
          movementTypeId,
          createdBy: userId,
          quantity: -1,
          notes: "Sales out by ordering",
        });
      }
      await InventoryMovement.insertMany(inventoryMovementsInsert, { session });
    }

    // Remove items from cart if exists
    await Cart.deleteMany({
      userId,
      variationId: { $in: items.map((i) => i.variationId) },
    }).session(session);

    // Create order
    const order = new Order({
      userId,
      items: orderItemsInsert,
      totalCents: orderItemsInsert.reduce(
        (sum, item) => sum + item.totalCents,
        0
      ),
      deliveryStateId: getDeliveryStateId("order placed"),
      estimateReceivedDate: new Date(Date.now() + ESTIMATE_RECEIVED_DATE),
      deliveryAddress: address,
    });
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
      return next(errorHandler(404, "Order not found."));
    }
    const order = await Order.findById(id).lean();
    if (!order) {
      return next(errorHandler(404, "Order not found."));
    }

    // Check permission
    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (order.userId.toString() !== userId && isBuyerOnly) {
      return next(
        errorHandler(403, "You do not have permission to view this order.")
      );
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

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating order...");
  const { id } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Order not found."));
    }
    const order = await Order.findById(id);
    if (!order) {
      return next(errorHandler(404, "Order not found."));
    }

    // Check permission
    const { userId, isBuyerOnly } = req["auth"] as RequestAuth;
    if (order.userId.toString() !== userId && isBuyerOnly) {
      return next(
        errorHandler(403, "You do not have permission to update this order.")
      );
    }

    /*
      Business logic:
        1. order can't be updated if it has been received or canceled or returned.
        2. deliveryStateId can only be updated forward
        3. estimateReceivedDate must be greater than orderDate(createdAt).
        4. deliveryAddressId can only be updated if deliveryStateId is before "shipped".
    */
    if (
      order.deliveryStateId.equals(getDeliveryStateId("received")) ||
      order.deliveryStateId.equals(getDeliveryStateId("cancelled")) ||
      order.deliveryStateId.equals(getDeliveryStateId("returned"))
    ) {
      return next(
        errorHandler(
          400,
          "Order cannot be updated after it has been received, cancelled, or returned."
        )
      );
    }

    const { deliveryStateId, estimateReceivedDate, deliveryAddressId } =
      req.body as OrderUpdate;

    const updatedDeliveryStateId = deliveryStateId
      ? new Types.ObjectId(deliveryStateId)
      : order.deliveryStateId;
    if (
      !updatedDeliveryStateId.equals(order.deliveryStateId) &&
      getDeliveryStateLevel(updatedDeliveryStateId) <
        getDeliveryStateLevel(order.deliveryStateId)
    ) {
      return next(
        errorHandler(400, "Delivery state can only be updated forward.")
      );
    }

    const updatedEstimateReceivedDate = estimateReceivedDate
      ? new Date(estimateReceivedDate)
      : order.estimateReceivedDate;
    if (
      updatedEstimateReceivedDate !== order.estimateReceivedDate &&
      updatedEstimateReceivedDate <= order.createdAt
    ) {
      return next(
        errorHandler(
          400,
          "Estimate received date must be greater than order date."
        )
      );
    }

    if (deliveryAddressId) {
      if (!Types.ObjectId.isValid(deliveryAddressId)) {
        return next(errorHandler(404, "Delivery address not found."));
      }
      const address = await UserAddress.findOne({
        _id: deliveryAddressId,
        userId,
      }).lean();
      if (!address) {
        return next(errorHandler(404, "Delivery address not found."));
      }

      // Check if delivery state is before "shipped"
      if (
        !compareAddress(address, order.deliveryAddress) &&
        getDeliveryStateLevel(order.deliveryStateId) >= 4
      ) {
        // "shipped" is level 4
        return next(
          errorHandler(
            400,
            "Delivery address can only be updated before the order is shipped."
          )
        );
      }

      order.deliveryAddress = address;
    }

    order.deliveryStateId = updatedDeliveryStateId;
    order.estimateReceivedDate = updatedEstimateReceivedDate;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: formatOrderResponse(order),
    } as SuccessResponse<OrderResponse>);
    console.log("✅ ", "Order updated successfully.");
  } catch (error) {
    next(error);
  }
}
