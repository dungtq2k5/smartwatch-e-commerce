import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import {
  CreateOrderPaymentIntent,
  CreateOrderPaymentIntentResponse,
  SuccessResponse,
} from "../../../common/types.common";
import Order from "../../models/order/order.model";
import { HttpError } from "../../utils/errorHandler";
import {
  getPaymentMethodName,
  getPaymentStatusId,
  getPaymentStatusName,
} from "../../utils/utils";
import stripe from "../../configs/stripe.config";
import Stripe from "stripe";
import mongoose from "mongoose";
import { executeOrderDeletion } from "./order.controller";
import User from "../../models/user/user.model";
import UserPaymentMethod from "../../models/user/userPaymentMethod.model";

export async function createPaymentIntent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating payment intent...");
  const userId = (req["auth"] as RequestAuth).userId;
  const { id: orderId } = req.params;
  const { saveCard } = req.body as CreateOrderPaymentIntent;

  try {
    // Check orderId exists
    const order = await Order.findById(orderId).lean();
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }

    // Check order belongs to user
    if (order.userId.toString() !== userId) {
      throw new HttpError(
        403,
        "You do not have permission to access this order."
      );
    }

    // Check order is in pending state
    if (getPaymentStatusName(order.paymentStatusId) !== "pending") {
      throw new HttpError(400, "Order is not in a valid state for payment.");
    }

    // Check order is not COD
    if (getPaymentMethodName(order.paymentMethodId) === "cash") {
      throw new HttpError(400, "Cannot create payment intent for COD orders.");
    }

    /*
      Business logic:
        - If user first non-COD payment -> create stripeCustomerId for user if not exists.
        - Create payment intent.
    */

    // Check user exists
    const user = await User.findById(userId);
    if (!user || user.isDeleted) {
      throw new HttpError(404, "User not found.");
    }

    // Create stripeCustomerId if not exists
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customerData: {
        name: string;
        email?: string;
        phone?: string;
      } = { name: user.fullName };
      
      if (user.email) {
        customerData["email"] = user.email;
      }
      if (user.phoneNumber) {
        customerData["phone"] = user.phoneNumber;
      }

      const customer = await stripe.customers.create(customerData);
      stripeCustomerId = customer.id;
      user.stripeCustomerId = stripeCustomerId;
      await user.save();
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.totalCents,
      currency: "usd",
      customer: stripeCustomerId, // Associate the payment with the customer
      setup_future_usage: saveCard ? "on_session" : undefined, // This tells Stripe to prepare to save the card if confirmed later
      metadata: { orderId: order._id.toString() }, // Store the orderId so we know which order to update when the payment succeeds
    });

    res.status(200).json({
      success: true,
      message: "Payment intent created successfully.",
      data: {
        clientSecret: paymentIntent.client_secret,
      },
    } as SuccessResponse<CreateOrderPaymentIntentResponse>);
  } catch (error) {
    next(error);
  }
}

// This function response to the Stripe's server, not the client
export async function handleStripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Handling Stripe webhook event...");
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (error) {
    console.error(
      "❌ ",
      "Webhook signature verification failed:",
      error.message
    );
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        // Check order exists
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          // If order is not found, we must return 200 to Stripe to stop retries for this non-existence order
          console.error(`Webhook Error: Order with ID ${orderId} not found.`);
          res.status(200).json({
            received: true,
            message: "Order not found, but acknowledged.",
          });
          await session.abortTransaction();
          return;
        }

        // Save payment method if requested
        if (
          paymentIntent.setup_future_usage === "on_session" &&
          paymentIntent.payment_method
        ) {
          const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentIntent.payment_method as string
          );

          // Attach payment method to customer
          await stripe.paymentMethods.attach(paymentMethod.id, {
            customer: paymentIntent.customer as string,
          });

          // Set it as the default payment method for the customer
          await stripe.customers.update(paymentIntent.customer as string, {
            invoice_settings: {
              default_payment_method: paymentMethod.id,
            },
          });

          await UserPaymentMethod.create(
            [
              {
                userId: order.userId,
                stripePaymentMethodId: paymentMethod.id,
                type: "card",
                card: {
                  brand: paymentMethod.card?.brand,
                  last4: paymentMethod.card?.last4,
                  expMonth: paymentMethod.card?.exp_month,
                  expYear: paymentMethod.card?.exp_year,
                },
                isDefault: true,
              },
            ],
            { session }
          );
        }

        // Update order
        order.orderDate = new Date();
        order.paymentStatusId = getPaymentStatusId("paid");
        order.payment = {
          amountCents: paymentIntent.amount,
          currency: paymentIntent.currency,
          transactionDate: new Date(paymentIntent.created * 1000), // Convert to JS Date
          relatedTransactionId: paymentIntent.id,
        };

        await order.save({ session });

        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.orderId;

        // Check order exists
        const order = await Order.findById(orderId).session(session);
        if (!order) {
          // If order is not found, we must return 200 to Stripe to stop retries for this non-existence order
          console.error(`Webhook Error: Order with ID ${orderId} not found.`);
          res.status(200).json({
            received: true,
            message: "Order not found, but acknowledged.",
          });
          await session.abortTransaction();
          return;
        }

        // Update order payment status
        order.paymentStatusId = getPaymentStatusId("failed");
        await order.save({ session });

        await executeOrderDeletion(order, session, {
          deleteOrderItself: false,
        });
        break;
      }
      default:
        console.log(`❓ `, `Unhandled event type: ${event.type}`);
    }

    await session.commitTransaction();
    res.status(200).json({ received: true });
    console.log("✅ ", "Stripe webhook event handled successfully.");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}
