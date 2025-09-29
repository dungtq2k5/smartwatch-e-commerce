import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import {
  SuccessResponse,
  CheckoutSessionResponse,
} from "../../../common/types.common";
import Order from "../../models/order/order.model";
import { HttpError } from "../../utils/errorHandler";
import {
  getOrderStateId,
  getPaymentMethodLookupId,
  getPaymentStateId,
  getPaymentStateLookupId,
  getSysUserId,
} from "../../utils/utils";
import stripe from "../../configs/stripe.config";
import Stripe from "stripe";
import mongoose, { Types } from "mongoose";
import {
  executeCartDeletion,
  handleOrderDeletion,
  getLatestStateId,
} from "./order.controller";
import User from "../../models/user/user.model";
import UserPaymentMethod from "../../models/user/userPaymentMethod.model";
import { formatError, isNoneArrObj } from "../../../common/utils.common";

export async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating checkout session...");
  const { id: orderId } = req.params;
  const userId = (req["auth"] as RequestAuth).userId;

  try {
    // Check orderId exists
    if (!Types.ObjectId.isValid(orderId)) {
      throw new HttpError(404, "Order not found.");
    }
    const order = await Order.findById(orderId)
      .populate({
        path: "items.variationId",
        populate: {
          path: "productModelId",
          populate: {
            path: "productId",
          },
        },
      })
      .lean();
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

    // Check latest payment status is in pending state
    const latestPaymentStateId = getLatestStateId(order.paymentStates)!;
    const latestPaymentStateLookupId =
      getPaymentStateLookupId(latestPaymentStateId);
    if (latestPaymentStateLookupId !== "1") {
      throw new HttpError(400, "Order is not in a valid state for payment.");
    }
    // Check order is COD
    if (
      getPaymentMethodLookupId(new Types.ObjectId(order.paymentMethodId)) ===
      "1"
    ) {
      throw new HttpError(
        400,
        "Cannot create checkout session for COD orders."
      );
    }

    // Check user exists and valid
    const user = (await User.findById(userId))!; // valid user was handled in auth middleware

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

    // Setup line items for checkout session
    const line_items = order.items.map((item) => {
      const variation = item.variationId as any; // Via populate
      const productModel = variation.productModelId as any; // Via populate
      const product = productModel.productId as any; // Via populate

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${product.name} - ${productModel.name}`,
            images: variation.imageUrls.length
              ? variation.imageUrls
              : productModel.imageUrls.length
              ? productModel.imageUrls
              : product.imageUrls.length
              ? product.imageUrls
              : undefined,
          },
          unit_amount: item.totalCents! / item.quantity!,
        },
        quantity: item.quantity!,
      };
    });

    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer: stripeCustomerId,
      payment_intent_data: { setup_future_usage: "on_session" },
      success_url: `${process.env.CLIENT_URL}/order-status?method=stripe&redirect_status=succeeded&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/order-status?method=stripe&redirect_status=failed`,
      metadata: {
        orderId: order._id.toString(),
      },
    };

    if (order.paymentSummary.appliedBalanceCents) {
      const coupon = await stripe.coupons.create({
        name: "Balance Applied",
        amount_off: order.paymentSummary.appliedBalanceCents as number,
        currency: "usd",
        duration: "once",
      });
      sessionPayload.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    res.status(200).json({
      success: true,
      message: "Stripe checkout session created successfully.",
      data: { url: session.url },
    } as SuccessResponse<CheckoutSessionResponse>);
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
    const errMsg = formatError(error);
    console.error(
      "❌ ",
      "Webhook signature verification failed:",
      errMsg
    );
    res.status(400).send(`Webhook Error: ${errMsg}`);
    return;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const orderId = checkoutSession.metadata?.orderId;
        const paymentIntentId = checkoutSession.payment_intent as string;

        // Check if orderId is valid
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

        // Check if a payment method should me saved
        if (checkoutSession.customer) {
          try {
            // Retrieve the PaymentIntent and expand the payment method
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentIntentId,
              { expand: ["payment_method"] }
            );

            // Ensure payment_method is an obj
            if (isNoneArrObj(paymentIntent.payment_method)) {
              const paymentMethod =
                paymentIntent.payment_method as Stripe.PaymentMethod;

              // Avoid saving duplicate payment methods
              const existingPaymentMethod = await UserPaymentMethod.findOne({
                userId: order.userId,
                stripePaymentMethodId: paymentMethod.id,
              })
                .lean()
                .session(session);

              if (!existingPaymentMethod && paymentMethod.card) {
                // Check if user has any other default payment method
                const defaultPaymentMethod = await UserPaymentMethod.findOne({
                  userId: order.userId,
                  isDefault: true,
                })
                  .lean()
                  .session(session);

                await UserPaymentMethod.create(
                  [
                    {
                      userId: order.userId,
                      stripePaymentMethodId: paymentMethod.id,
                      type: paymentMethod.type,
                      card: {
                        brand: paymentMethod.card.brand,
                        last4: paymentMethod.card.last4,
                        expMonth: paymentMethod.card.exp_month,
                        expYear: paymentMethod.card.exp_year,
                      },
                      isDefault: !defaultPaymentMethod, // Set as default if no other default exists
                    },
                  ],
                  { session }
                );
                console.log("✅ ", "User payment method saved successfully.");
              }
            }
          } catch (error) {
            // Log the error but don't block the main transaction
            console.error("❌ ", "Error saving payment method:", error);
          }
        }

        // Remove items from cart
        await executeCartDeletion(
          order.userId,
          order.items.map(({ variationId, quantity }) => ({
            variationId,
            quantity: quantity!,
          })),
          session
        );

        // Update order
        const sysUserId = getSysUserId();
        order.paymentStates.push({
          id: getPaymentStateId("2"), // paid
          notes: "Payment succeeded via Stripe.",
          createdBy: sysUserId,
        });
        order.states.push({
          id: getOrderStateId("2"), // confirmed
          notes: "Order confirmed after successful payment.",
          createdBy: sysUserId,
        });
        order.orderDate = new Date();
        order.transaction = {
          amountCents: checkoutSession.amount_total as number,
          currency: checkoutSession.currency as string,
          transactionDate: new Date(checkoutSession.created * 1000), // Convert to JS Date
          paymentIntentId,
        };

        await order.save({ session });
        console.log(
          "✅ ",
          "Order updated successfully after checkout session."
        );
        break;
      }
      case "checkout.session.expired": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const orderId = checkoutSession.metadata?.orderId;

        // Check if orderId is valid
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

        // Update order and its items
        await handleOrderDeletion(order, session, {
          deleteOrderItself: false,
        });

        const sysUserId = getSysUserId();
        order.paymentStates.push({
          id: getPaymentStateId("3"), // failed
          notes: "Payment session expired.",
          createdBy: sysUserId,
        });
        order.states.push({
          id: getOrderStateId("7"), // cancelled
          notes: "Order cancelled due to payment timeout.",
          createdBy: sysUserId,
        });

        await order.save({ session });
        console.log(
          "✅ ",
          "Order updated successfully after checkout session expired."
        );
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
    console.error("❌ ", "Error handling Stripe webhook event:", error);
    next(error);
  } finally {
    session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
export async function createRefund(
  paymentIntentId: string,
  amountCents?: number
): Promise<Stripe.Refund> {
  console.log("▶️ ", `Creating Stripe refund for ${paymentIntentId}...`);
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason: "requested_by_customer",
    });
    console.log("✅ ", `Stripe refund ${refund.id} created successfully.`);
    return refund;
  } catch (error) {
    console.error("❌ ", "Error creating Stripe refund:", error);
    throw error;
  }
}
