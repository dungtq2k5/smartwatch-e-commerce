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
// Only fetch data needed for the UI, can be adjusted in the future

export async function getSelfAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user cart details request...");
  const { userId } = req["auth"] as RequestAuth;

  try {
    const carts = await Cart.find({ userId })
      .populate<any>({
        path: "variation", // Uses the virtual
        match: { isDeleted: false },
        populate: {
          path: "productModelId",
          match: { isDeleted: false },
          populate: [
            {
              path: "config.osId",
              // match: { isDeleted: false },
            },
            {
              path: "productId",
              match: { isDeleted: false },
              populate: [
                {
                  path: "brandId",
                  // match: { isDeleted: false },
                },
                {
                  path: "categoryId",
                  // match: { isDeleted: false },
                },
              ],
            },
          ],
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out carts where population failed (due to deleted documents)
    const validCarts = carts.filter(
      (cart) =>
        cart.variation &&
        cart.variation.productModelId &&
        cart.variation.productModelId.productId
    );

    const formattedCarts: UserCartResponse[] = validCarts.map((cart) =>
      formatUserCartResponse(cart)
    );

    res.status(200).json({
      success: true,
      message: "User cart details retrieved successfully",
      data: {
        total: formattedCarts.length,
        items: formattedCarts,
      },
    } as SuccessResponse<UserCartResponseList>);
    console.log("✅", "User cart details retrieved successfully.");
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
  const { variationId, quantity } = req.body as UserCartCreate;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation, model, product exists
    if (!Types.ObjectId.isValid(variationId)) {
      return next(errorHandler(404, "Variation not found."));
    }

    const populatedVariation = await ModelVariation.findById(variationId)
      .populate({
        path: "productModelId",
        populate: {
          path: "productId",
        },
      })
      .lean()
      .session(session);

    const variation = populatedVariation as any;
    const model = variation.productModelId;
    const product = model.productId;

    if (
      !variation ||
      variation.isDeleted ||
      model.isDeleted ||
      product.isDeleted
    ) {
      return next(
        errorHandler(404, "Product variation, model, or product not found.")
      );
    }

    // Check is still selling
    if (product.stopSelling || model.stopSelling || variation.stopSelling) {
      return next(
        errorHandler(400, "This product is not available for purchase.")
      );
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
      ? existingCart.quantity! + (quantity || 1)
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
      cart = existingCart;
    } else {
      const newCart = new Cart({
        userId,
        variationId,
        quantity: totalQuantity,
      });
      await newCart.save({ session });
      cart = newCart;
    }

    await session.commitTransaction();

    await cart.populate({
      path: "variation", // Uses the virtual
      match: { stopSelling: false, isDeleted: false },
      populate: {
        path: "productModelId",
        match: { stopSelling: false, isDeleted: false },
        populate: [
          {
            path: "config.osId",
            // match: { isDeleted: false }
          },
          {
            path: "productId",
            match: { stopSelling: false, isDeleted: false },
            populate: [
              {
                path: "brandId",
                // match: { isDeleted: false }
              },
              {
                path: "categoryId",
                // match: { isDeleted: false }
              },
            ],
          },
        ],
      },
    });

    if (
      !cart.variation ||
      !cart.variation.productModelId ||
      !cart.variation.productModelId.productId
    ) {
      return next(errorHandler(500, "Failed to populate cart details."));
    }

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
    const populatedVariation = await ModelVariation.findById(variationId)
      .populate({
        path: "productModelId",
        populate: {
          path: "productId",
        },
      })
      .lean();

    const variation = populatedVariation as any;
    const model = variation.productModelId;
    const product = model.productId;

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
    // If quantity is 0, delete the cart item
    const quantity = req.body.quantity as number;
    if (quantity === 0) {
      await cart.deleteOne();
      res.status(200).json({
        success: true,
        message: "Cart updated successfully",
      } as SuccessResponse);
      console.log("✅", "Cart item deleted successfully.");
      return;
    }

    // Check if product is still available
    if (model.isDeleted || product.isDeleted) {
      return next(errorHandler(404, "Product model or product not found."));
    }
    if (product.stopSelling || model.stopSelling || variation.stopSelling) {
      return next(
        errorHandler(
          400,
          "This product is not available for purchase anymore."
        )
      );
    }

    // Check stock quantity
    if (quantity > variation.stockQuantity!) {
      return next(
        errorHandler(
          400,
          `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
        )
      );
    }

    cart.quantity = quantity;
    await cart.save();
    await cart.populate({
      path: "variation",
      match: { stopSelling: false, isDeleted: false },
      populate: {
        path: "productModelId",
        match: { stopSelling: false, isDeleted: false },
        populate: [
          {
            path: "config.osId",
            // match: { isDeleted: false },
          },
          {
            path: "productId",
            match: { stopSelling: false, isDeleted: false },
            populate: [
              {
                path: "brandId",
                // match: { isDeleted: false },
              },
              {
                path: "categoryId",
                // match: { isDeleted: false },
              },
            ],
          },
        ],
      },
    });

    const cartPopulated: any = cart; // Type assertion to access populated fields
    if (
      !cartPopulated.variation ||
      !cartPopulated.variation.productModelId ||
      !cartPopulated.variation.productModelId.productId
    ) {
      return next(errorHandler(500, "Failed to populate cart details."));
    }

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      data: formatUserCartResponse(cartPopulated),
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
    const variation = await ModelVariation.findById(variationId).lean();
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
