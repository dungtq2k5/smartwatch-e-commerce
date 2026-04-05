import { Request, Response, NextFunction } from "express";
import {
  SuccessResponse,
  CheckoutSessionResponse,
  StripeSetupIntentResponse,
} from "../../common/types.common";
import Order from "../models/order/order.model";
import { HttpError } from "../utils/errorHandler";
import {
  getLatestStateId,
  getOrderStateId,
  getPaymentMethodLookupId,
  getPaymentStateId,
  getPaymentStateLookupId,
  getSysUserId,
  getWithdrawalStateId,
  isPresent,
} from "../utils/utils";
import stripe from "../configs/stripe.config";
import Stripe from "stripe";
import mongoose, { Types } from "mongoose";
import {
  executeCartDeletion,
  handleOrderDeletion,
} from "./order/order.controller";
import User from "../models/user/user.model";
import UserPaymentMethod from "../models/user/userPaymentMethod.model";
import { formatError, isNoneArrObj } from "../../common/utils.common";
import { USER_PAYMENT_METHOD_TYPES } from "../configs/configs";
import { LOOKUP_ID } from "../../common/configs.common";
import UserBankAccount from "../models/user/userBankAccount.model";
import WithdrawalRequest from "../models/withdrawal/withdrawalRequest.model";

export async function createCheckoutSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating checkout session...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares.",
      ),
    );
  }
  const { orderId } = req.params;

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
        "You do not have permission to access this order.",
      );
    }

    // Check latest payment status is in pending state
    const latestPaymentStateId = getLatestStateId(order.paymentStates);
    const latestPaymentStateLookupId =
      getPaymentStateLookupId(latestPaymentStateId);
    if (latestPaymentStateLookupId !== LOOKUP_ID.PAYMENT_STATE.PENDING) {
      throw new HttpError(400, "Order is not in a valid state for payment.");
    }
    // Check order is COD
    if (
      getPaymentMethodLookupId(new Types.ObjectId(order.paymentMethodId)) ===
      LOOKUP_ID.PAYMENT_METHOD.CASH
    ) {
      throw new HttpError(
        400,
        "Cannot create checkout session for COD orders.",
      );
    }

    // Create stripeCustomerId if not exists
    const stripeCustomerId = await findOrCreateStripeCustomer(userId);

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
          unit_amount: item.totalCents / item.quantity,
        },
        quantity: item.quantity,
      };
    });

    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: [...USER_PAYMENT_METHOD_TYPES],
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
    if (!session.url) {
      throw new HttpError(500, "Failed to create Stripe checkout session.");
    }

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
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Handling Stripe webhook event...");
  const sig = req.headers["stripe-signature"] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (error) {
    const errMsg = formatError(error);
    console.error("❌ ", "Webhook signature verification failed:", errMsg);
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
              { expand: ["payment_method"] },
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
                  { session },
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
            quantity,
          })),
          session,
        );

        // Update order
        const sysUserId = getSysUserId();
        order.paymentStates.push({
          id: getPaymentStateId(LOOKUP_ID.PAYMENT_STATE.PAID),
          notes: "Payment succeeded via Stripe.",
          createdBy: sysUserId,
        });
        order.states.push({
          id: getOrderStateId(LOOKUP_ID.ORDER_STATE.CONFIRMED),
          notes: "Order confirmed after successful payment.",
          createdBy: sysUserId,
        });
        order.orderDate = new Date();
        order.transaction = {
          amountCents: Number(checkoutSession.amount_total),
          currency: String(checkoutSession.currency),
          transactionDate: new Date(checkoutSession.created * 1000), // Convert to JS Date
          paymentIntentId,
        };

        await order.save({ session });
        console.log(
          "✅ ",
          "Order updated successfully after checkout session.",
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
          id: getPaymentStateId(LOOKUP_ID.PAYMENT_STATE.FAILED),
          notes: "Payment session expired.",
          createdBy: sysUserId,
        });
        order.states.push({
          id: getOrderStateId(LOOKUP_ID.ORDER_STATE.CANCELLED),
          notes: "Order cancelled due to payment timeout.",
          createdBy: sysUserId,
        });

        await order.save({ session });
        console.log(
          "✅ ",
          "Order updated successfully after checkout session expired.",
        );
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const bankAccount = await UserBankAccount.findOne({
          stripeConnectedAccountId: account.id,
        });
        if (!bankAccount) {
          console.error(
            `Webhook Error: Bank account with Stripe Connected Account ID ${account.id} not found.`,
          );
          res.status(200).json({
            received: true,
            message: "Bank account not found, but acknowledged.",
          });
          await session.abortTransaction();
          return;
        }

        // Update bank account details if available
        if (account.external_accounts?.data?.length) {
          const externalAccount = account.external_accounts.data[0];
          const fingerprint = externalAccount.fingerprint;

          // Remove duplicate bank accounts with the same fingerprint for the same user
          if (fingerprint) {
            const deletedDupAccount = await UserBankAccount.findOne({
              userId: bankAccount.userId,
              stripeBankAccountFingerprint: fingerprint,
              _id: { $ne: bankAccount._id },
            })
              .lean()
              .session(session);
            if (deletedDupAccount) {
              console.log(
                "⚠️ ",
                "Duplicate bank account detected. Removing the newly added bank account and keeping the existing one.",
              );
              // Clean up the new, redundant Stripe account and in DB
              await bankAccount.deleteOne({ session });
              try {
                await stripe.accounts.del(account.id);
              } catch {
                // If the account was already deleted, we can ignore this error
                console.warn(
                  `Could not delete Stripe account ${account.id}, it might be already deleted.`,
                );
              }
              await session.commitTransaction();
              console.log(
                "✅ ",
                "Duplicate bank account removed successfully.",
              );

              res.status(200).json({
                received: true,
                message: "Duplicate bank account detected and handled.",
              });
              return;
            }

            bankAccount.stripeBankAccountFingerprint = fingerprint;
          }

          if (externalAccount.object === "bank_account") {
            bankAccount.accountHolderName =
              externalAccount.account_holder_name || "Unknown";
            bankAccount.last4 = externalAccount.last4;
            bankAccount.bankName = externalAccount.bank_name || "Unknown Bank";
            bankAccount.routingNumber = externalAccount.routing_number;
            bankAccount.accountType = externalAccount.account_type
              ? "savings"
              : "checking";
          }
        }

        // Update verification status
        if (account.details_submitted && account.charges_enabled) {
          bankAccount.isVerified = true;
          bankAccount.requiresAction = false;
        }

        // Update account status
        if (account.charges_enabled) {
          bankAccount.accountStatus = "enabled";

          // If there is none default enabled bank account for the user, set this as default
          if (
            (await UserBankAccount.countDocuments({
              userId: bankAccount.userId,
              accountStatus: "enabled",
              isDefault: true,
            }).session(session)) === 0
          ) {
            bankAccount.isDefault = true;
          }
        } else if (account.requirements?.disabled_reason) {
          bankAccount.accountStatus = "restricted";
        }

        await bankAccount.save({ session });
        console.log("✅ ", "User bank account updated successfully.");
        break;
      }
      case "transfer.created": {
        const transfer = event.data.object as Stripe.Transfer;
        const withdrawalRequestId = transfer.metadata.withdrawalRequestId;

        // Check if withdrawalRequestId is valid
        const withdrawalRequest =
          await WithdrawalRequest.findById(withdrawalRequestId).session(
            session,
          );
        if (!withdrawalRequest) {
          // If withdrawal request is not found, we must return 200 to Stripe to stop retries for this non-existence request
          console.error(
            `Webhook Error: Withdrawal request with ID ${withdrawalRequestId} not found.`,
          );
          res.status(200).json({
            received: true,
            message: "Withdrawal request not found, but acknowledged.",
          });
          await session.abortTransaction();
          return;
        }

        // Update withdrawal request
        withdrawalRequest.stripeTransferId = transfer.id;
        withdrawalRequest.processedAt = new Date();
        withdrawalRequest.states.push({
          id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.COMPLETED),
          notes: `Withdrawal completed via Stripe. Transfer ID: ${transfer.id}`,
          createdBy: getSysUserId(),
        });

        await withdrawalRequest.save({ session });
        console.log("✅ ", "Withdrawal request updated successfully.");
        break;
      }
      case "transfer.reversed": {
        const transfer = event.data.object as Stripe.Transfer;
        const withdrawalRequestId = transfer.metadata.withdrawalRequestId;

        // Check if withdrawalRequestId is valid
        const withdrawalRequest =
          await WithdrawalRequest.findById(withdrawalRequestId).session(
            session,
          );
        if (!withdrawalRequest) {
          // If withdrawal request is not found, we must return 200 to Stripe to stop retries for this non-existence request
          console.error(
            `Webhook Error: Withdrawal request with ID ${withdrawalRequestId} not found.`,
          );
          res.status(200).json({
            received: true,
            message: "Withdrawal request not found, but acknowledged.",
          });
          await session.abortTransaction();
          return;
        }

        // Refund amount back to user balance
        await User.findByIdAndUpdate(
          withdrawalRequest.userId,
          { $inc: { userBalanceCents: withdrawalRequest.amountCents } },
          { session },
        );

        // Update withdrawal request
        withdrawalRequest.failureReason = "Transfer was reversed by Stripe";
        withdrawalRequest.states.push({
          id: getWithdrawalStateId(LOOKUP_ID.WITHDRAWAL_STATE.FAILED),
          notes: `Transfer reversed: ${
            transfer.metadata.reversalReason || "Unknown reason"
          }`,
          createdBy: getSysUserId(),
        });

        await withdrawalRequest.save({ session });
        console.log("✅ ", "Withdrawal request updated successfully.");
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
  amountCents?: number,
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

export async function findOrCreateStripeCustomer(
  userId: string,
): Promise<string> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email || undefined,
      phone: user.phoneNumber || undefined,
      name: user.fullName,
      metadata: { userId: userId },
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  } catch (error) {
    console.error("❌ ", "Error in findOrCreateStripeCustomer:", error);
    throw error;
  }
}

export async function createSetupIntent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Processing create setup intent request...");

  const user = req["user"];
  if (!isPresent(user)) {
    throw new HttpError(
      500,
      "Request user not found, this should be handled in middlewares.",
    );
  }

  try {
    const customerId = await findOrCreateStripeCustomer(user.id);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: [...USER_PAYMENT_METHOD_TYPES],
      usage: "on_session",
    });

    if (!setupIntent.client_secret) {
      throw new HttpError(500, "Failed to create Stripe setup intent.");
    }

    res.status(200).json({
      success: true,
      message: "Setup intent created successfully.",
      data: { clientSecret: setupIntent.client_secret },
    } as SuccessResponse<StripeSetupIntentResponse>);
    console.log("✅ ", "Setup intent created successfully.");
  } catch (error) {
    next(error);
  }
}
