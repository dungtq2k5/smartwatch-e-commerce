import { Request, Response, NextFunction } from "express";
import { formatUserCartResponse } from "../../utils/utils";
import {
  SuccessResponse,
  UserCartCreate,
  UserCartResponse,
  UserCartResponseList,
} from "../../../common/types.common";
import { errorHandler } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import { RequestAuth } from "../../utils/types";
import Cart from "../../models/user/cart.model";
import ModelVariation from "../../models/product/modelVariation.model";

// --- BOTH ADMIN AND BUYER FUNCTIONS ---
export async function getSelfAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user cart request...");
  const { userId } = req["auth"] as RequestAuth;

  try {
    const carts = await Cart.find({ userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "User cart retrieved successfully",
      data: {
        carts: carts.map((cart) => formatUserCartResponse(cart)),
        total: carts.length,
      },
    } as SuccessResponse<UserCartResponseList>);
    console.log("✅", "User cart retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function createSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing create user cart request...");
  const {
    variationId,
    quantity
  } = req.body as UserCartCreate;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await ModelVariation.findById(variationId).session(
      session
    );
    if (!variation || variation.isDeleted) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Business logic
    // Cart exists -> update quantity
    // Cart does not exist -> create new cart
    const { userId } = req["auth"] as RequestAuth;
    const existingCart = await Cart.findOne({
      userId,
      variationId,
    }).session(session);
    const totalQuantity = existingCart
      ? existingCart.quantity + (quantity || 1)
      : quantity || 1;
    if (totalQuantity > variation.stockQuantity) {
      return next(
        errorHandler(
          400,
          `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
        )
      );
    }

    let cart: any;
    if (existingCart) {
      existingCart.quantity = totalQuantity;
      await existingCart.save({ session });
      cart = formatUserCartResponse(existingCart);
    } else {
      const newCart = new Cart({
        userId,
        variationId,
        quantity: totalQuantity,
      });
      await newCart.save({ session });
      cart = formatUserCartResponse(newCart);
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "User cart created successfully",
      data: formatUserCartResponse(cart),
    } as SuccessResponse<UserCartResponse>);
    console.log("✅", "User cart created successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function updateSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing update user cart request...");
  const variationId = req.params.variationId;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await ModelVariation.findById(variationId);
    if (!variation || variation.isDeleted) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Check cart exists
    const { userId } = req["auth"] as RequestAuth;
    const cart = await Cart.findOne({
      userId,
      variationId,
    });
    if (!cart) {
      return next(errorHandler(404, "Cart item not found."));
    }

    // Business logic
    const quantity = req.body.quantity as number;
    if (quantity > variation.stockQuantity) {
      return next(
        errorHandler(
          400,
          `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
        )
      );
    }
    if (quantity === 0) {
      await cart.deleteOne();
      res.status(200).json({
        success: true,
        message: "Cart updated successfully",
      } as SuccessResponse);
      console.log("✅", "Cart item deleted successfully.");
      return;
    }

    cart.quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: formatUserCartResponse(cart),
    } as SuccessResponse<UserCartResponse>);
    console.log("✅", "Cart updated successfully.");
  } catch (error) {
    next(error);
  }
}

export async function removeSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing delete user cart request...");
  const variationId = req.params.variationId;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }
    const variation = await ModelVariation.findById(variationId);
    if (!variation || variation.isDeleted) {
      return next(errorHandler(404, "Variation not found."));
    }

    // Check cart exists
    const { userId } = req["auth"] as RequestAuth;
    const cart = await Cart.findOne({
      userId,
      variationId,
    });
    if (!cart) {
      return next(errorHandler(404, "Cart item not found."));
    }

    // Business logic
    await cart.deleteOne();

    res.status(200).json({
      success: true,
      message: "Cart item deleted successfully",
    } as SuccessResponse);
    console.log("✅", "Cart item deleted successfully.");
  } catch (error) {
    next(error);
  }
}
