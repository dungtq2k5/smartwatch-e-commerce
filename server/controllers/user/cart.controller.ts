import { Request, Response, NextFunction } from "express";
import { formatUserCartResponse, isPresent } from "../../utils/utils";
import {
  SuccessResponse,
  UserCartCreate,
  UserCartResponse,
  UserCartListResponse,
  UserCartBulkCreate,
} from "../../../common/types.common";
import { HttpError } from "../../utils/errorHandler";
import mongoose, { Types } from "mongoose";
import Cart from "../../models/user/cart.model";
import ModelVariation from "../../models/product/modelVariation.model";
import { MAX_ITEMS_FOR_CREATE_BULK_CART } from "../../../common/configs.common";

// --- BOTH ADMIN AND BUYER FUNCTIONS ---
// Only fetch data needed for the UI, can be adjusted in the future

export async function getSelfAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get user cart details request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }

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
    } as SuccessResponse<UserCartListResponse>);
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

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { variationId, quantity } = req.body as UserCartCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check variation, model, product exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Variation not found.");
    }

    const populatedVariation = await ModelVariation.findById(variationId)
      .populate({
        path: "productModelId",
        select: "stopSelling isDeleted",
        populate: {
          path: "productId",
          select: "stopSelling isDeleted",
        },
      })
      .lean()
      .session(session);

    if (!populatedVariation || populatedVariation.isDeleted) {
      throw new HttpError(404, "Variation not found.");
    }

    const variation = populatedVariation as any;
    const model = variation.productModelId;
    const product = model.productId;

    if (model.isDeleted || product.isDeleted) {
      throw new HttpError(404, "Product model, or product not found.");
    }

    // Check is still selling
    if (product.stopSelling || model.stopSelling || variation.stopSelling) {
      throw new HttpError(400, "This product is not available for purchase.");
    }

    /*
      Business logic:
        - Cart exists -> update quantity
        - Cart does not exist -> create new cart
    */
    const existingCart = await Cart.findOne({
      userId,
      variationId,
    }).session(session);
    const totalQuantity = existingCart
      ? existingCart.quantity + (quantity || 1)
      : quantity || 1;
    if (totalQuantity > variation.stockQuantity) {
      throw new HttpError(
        400,
        `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
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
      throw new HttpError(500, "Failed to populate cart details.");
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

export async function createBulkSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing bulk create user cart request...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { items } = req.body as UserCartBulkCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (items.length > MAX_ITEMS_FOR_CREATE_BULK_CART) {
      throw new HttpError(
        400,
        `Cannot add more than ${MAX_ITEMS_FOR_CREATE_BULK_CART} items at once.`
      );
    }

    // --- 1. Aggregate and Validate Input ---
    const variationIds = items.map((i) => {
      const variationId = i.variationId;

      if (!Types.ObjectId.isValid(variationId)) {
        throw new HttpError(404, `Variation not found: ${variationId}`);
      }

      return variationId;
    });

    // --- 2. Fetch Required Data in Bulk ---
    const variations = await ModelVariation.find({
      _id: { $in: variationIds },
      isDeleted: false,
      stopSelling: false,
    })
      .populate({
        path: "productModelId",
        select: "stopSelling isDeleted",
        populate: {
          path: "productId",
          select: "stopSelling isDeleted",
        },
      })
      .session(session)
      .lean();
    const existingCarts = await Cart.find({
      userId,
      variationId: { $in: variationIds },
    })
      .session(session)
      .lean();

    const variationsMap = new Map(variations.map((v) => [v._id.toString(), v]));
    const existingCartsMap = new Map(
      existingCarts.map((c) => [c.variationId.toString(), c])
    );

    // --- 3. Prepare Bulk Operations ---
    const bulkOps: any[] = [];

    for (const { variationId, quantity } of items) {
      const variation = variationsMap.get(variationId);

      // Check if product exists and is sellable
      if (!variation) {
        throw new HttpError(
          404,
          `Variation with ID ${variationId} not found, has been deleted, or is no longer for sale.`
        );
      }
      const model = variation.productModelId as any;
      const product = model.productId as any;
      if (
        model.isDeleted ||
        product.isDeleted ||
        model.stopSelling ||
        product.stopSelling
      ) {
        throw new HttpError(
          404,
          `The product for variation ${variationId} is no longer available.`
        );
      }

      const existingCart = existingCartsMap.get(variationId);
      const currQuant = existingCart?.quantity || 0;
      const newTotalQuant = currQuant + (quantity || 1);

      // Check stock
      if (newTotalQuant > variation.stockQuantity) {
        throw new HttpError(
          400,
          `Not enough stock for variation ${variation.name}. Only ${variation.stockQuantity} left.`
        );
      }

      if (existingCart) {
        // Update existing cart
        bulkOps.push({
          updateOne: {
            filter: { _id: existingCart._id },
            update: { $set: { quantity: newTotalQuant } },
          },
        });
      } else {
        // Insert new cart
        bulkOps.push({
          insertOne: {
            document: {
              userId,
              variationId,
              quantity: newTotalQuant,
            },
          },
        });
      }
    }

    // --- 4. Execute Bulk Write ---
    if (bulkOps.length > 0) {
      await Cart.bulkWrite(bulkOps, { session });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Cart updated successfully.",
    } as SuccessResponse);
    console.log("✅", "Bulk cart creation successful.");
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

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const variationId = req.params.variationId;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Variation not found.");
    }
    const populatedVariation = await ModelVariation.findById(variationId)
      .populate({
        path: "productModelId",
        select: "stopSelling isDeleted",
        populate: {
          path: "productId",
          select: "stopSelling isDeleted",
        },
      })
      .lean();

    if (!populatedVariation || populatedVariation.isDeleted) {
      throw new HttpError(404, "Variation not found.");
    }

    const variation = populatedVariation as any;
    const model = variation.productModelId;
    const product = model.productId;

    // Check cart exists
    const cart = await Cart.findOne({
      userId,
      variationId,
    });
    if (!cart) {
      throw new HttpError(404, "Cart item not found.");
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
      throw new HttpError(404, "Product model or product not found.");
    }
    if (product.stopSelling || model.stopSelling || variation.stopSelling) {
      throw new HttpError(
        400,
        "This product is not available for purchase anymore."
      );
    }

    // Check stock quantity
    if (quantity > variation.stockQuantity) {
      throw new HttpError(
        400,
        `Not enough stock for this variation. Only ${variation.stockQuantity} left.`
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
      throw new HttpError(500, "Failed to populate cart details.");
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

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const variationId = req.params.variationId;

  try {
    // Check variation exists
    if (!Types.ObjectId.isValid(variationId)) {
      throw new HttpError(404, "Variation not found.");
    }
    const variation = await ModelVariation.findById(variationId).lean();
    if (!variation || variation.isDeleted) {
      throw new HttpError(404, "Variation not found.");
    }

    // Check cart exists
    const cart = await Cart.findOne({
      userId,
      variationId,
    });
    if (!cart) {
      throw new HttpError(404, "Cart item not found.");
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
