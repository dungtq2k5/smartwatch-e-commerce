import { Request, Response, NextFunction } from "express";
import UserPaymentMethod from "../../models/user/userPaymentMethod.model";
import {
  formatUserSelfPaymentMethodResponse,
  isPresent,
} from "../../utils/utils";
import {
  SuccessResponse,
  UserPaymentMethodCreate,
  UserSelfPaymentMethodListResponse,
  UserSelfPaymentMethodResponse,
} from "../../../common/types.common";
import { HttpError } from "../../utils/errorHandler";
import stripe from "../../configs/stripe.config";
import { USER_PAYMENT_METHOD_TYPES } from "../../configs/configs";
import mongoose, { Types } from "mongoose";

export async function getSelfAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing get all self payment methods...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(new HttpError(500, "Request user id not found."));
  }

  try {
    const paymentMethods = await UserPaymentMethod.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Payment methods retrieved successfully.",
      data: {
        total: paymentMethods.length,
        methods: paymentMethods.map(formatUserSelfPaymentMethodResponse),
      },
    } as SuccessResponse<UserSelfPaymentMethodListResponse>);
    console.log("✅", "User self payment methods retrieved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function attachSelfPaymentMethod(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing attach payment method...");

  const [user, userId] = [req["user"], req["auth"]?.userId];
  if (!isPresent(user) || !isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User or User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { stripePaymentMethodId } = req.body as UserPaymentMethodCreate;

  try {
    /*
      Business Logic:
        1. If user reaches here, the payment method is already created and attached to the customer in Stripe at the client side.
        2. We will validate the payment method to decide if we want to save it in our DB or not(+detach from  Stripe).
    */

    if (!user.stripeCustomerId) {
      await stripe.paymentMethods.detach(stripePaymentMethodId);
      throw new HttpError(404, "Stripe customer not found for this user.");
    }

    // Retrieve details to save in DB
    const paymentMethod = await stripe.paymentMethods.retrieve(
      stripePaymentMethodId
    );
    if (
      !USER_PAYMENT_METHOD_TYPES.includes(paymentMethod.type as any) ||
      !paymentMethod.card
    ) {
      // Detach unsupported payment methods
      await stripe.paymentMethods.detach(stripePaymentMethodId);
      throw new HttpError(400, "Only card payment methods are supported.");
    }

    // Check for duplicates
    const existingCard = await UserPaymentMethod.findOne({
      userId,
      "card.brand": paymentMethod.card.brand,
      "card.last4": paymentMethod.card.last4,
      "card.expMonth": paymentMethod.card.exp_month,
      "card.expYear": paymentMethod.card.exp_year,
    }).lean();
    if (existingCard) {
      // Card already exists. Detach the new one from Stripe and inform the user.
      await stripe.paymentMethods.detach(stripePaymentMethodId);
      throw new HttpError(400, "This card is already added to your account.");
    }

    // Check if it's the first card being added
    const existingMethodsCount = await UserPaymentMethod.countDocuments({
      userId,
    });
    const isDefault = existingMethodsCount === 0;

    const newMethod = await UserPaymentMethod.create({
      userId,
      stripePaymentMethodId: paymentMethod.id,
      type: "card",
      card: {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      },
      isDefault,
    });

    if (isDefault) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: "Payment method added successfully.",
      data: formatUserSelfPaymentMethodResponse(newMethod),
    } as SuccessResponse<UserSelfPaymentMethodResponse>);
    console.log("✅ ", "Payment method attached and saved successfully.");
  } catch (error) {
    next(error);
  }
}

export async function setSelfAsDefault(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing set default self payment method...");

  const [user, userId] = [req["user"], req["auth"]?.userId];
  if (!isPresent(user) || !isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User or User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { methodId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!user.stripeCustomerId) {
      throw new HttpError(404, "Stripe customer not found for this user.");
    }

    if (!Types.ObjectId.isValid(methodId)) {
      throw new HttpError(404, "Payment method not found.");
    }
    const paymentMethod = await UserPaymentMethod.findOne({
      _id: methodId,
      userId,
    }).session(session);
    if (!paymentMethod) {
      throw new HttpError(404, "Payment method not found.");
    }

    if (paymentMethod.isDefault) {
      throw new HttpError(400, "This payment method is already the default.");
    }

    await UserPaymentMethod.updateMany(
      { userId, isDefault: true },
      { isDefault: false },
      { session }
    );

    paymentMethod.isDefault = true;
    await paymentMethod.save({ session });

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.stripePaymentMethodId,
      },
    });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Default payment method updated successfully.",
      data: formatUserSelfPaymentMethodResponse(paymentMethod),
    } as SuccessResponse<UserSelfPaymentMethodResponse>);
    console.log("✅", "Default self payment method updated successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function removeSelf(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Processing remove self payment method...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "Request user id not found, this should be handled by middlewares."
      )
    );
  }
  const { methodId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(methodId)) {
      throw new HttpError(404, "Payment method not found.");
    }
    const paymentMethod = await UserPaymentMethod.findOne({
      _id: methodId,
      userId,
    }).session(session);
    if (!paymentMethod) {
      throw new HttpError(404, "Payment method not found.");
    }

    await paymentMethod.deleteOne({ session });

    // If it's default -> update another one (if any) to be default
    if (paymentMethod.isDefault) {
      const anotherMethod = await UserPaymentMethod.findOne({
        userId,
        _id: { $ne: methodId },
      })
        .sort({ createdAt: -1 })
        .session(session);
      if (anotherMethod) {
        anotherMethod.isDefault = true;
        await anotherMethod.save({ session });
      }
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Payment method removed successfully.",
    } as SuccessResponse);
    console.log("✅", "Self payment method removed successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}
