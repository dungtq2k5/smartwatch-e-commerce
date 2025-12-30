import dotenv from "dotenv";
import { seedAllCollections } from "./utils/seedings";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoute from "./routes/auth.route";

import userRoute from "./routes/user.route";
import userCartRoute from "./routes/user/cart.route";
import userAddressRoute from "./routes/user/userAddress.route";
import userBankAccountRoute from "./routes/user/userBankAccount.route";
import userBalanceHistoryRoute from "./routes/user/userBalanceHistory.route";
import userPaymentMethodRoute from "./routes/user/userPaymentMethod.route";

import roleRoute from "./routes/role/role.route";
import permissionRoute from "./routes/role/permission.route";
import webhookRoute from "./routes/webhook.route";
import providerRoute from "./routes/provider.route";
import withdrawalRequestRoute from "./routes/withdrawalRequest/withdrawalRequest.route";
import withdrawalStateRoute from "./routes/withdrawalRequest/withdrawalState.route";

import productRoute from "./routes/product/product.route";
import productOsRoute from "./routes/product/os.route";
import productBrandRoute from "./routes/product/brand.route";
import productCategoryRoute from "./routes/product/category.route";
import productModelRoute from "./routes/product/productModel.route";
import modelVariationRoute from "./routes/product/modelVariation.route";
import variationInstanceRoute from "./routes/product/variationInstance.route";

import instanceCondition from "./routes/product/instanceCondition.route";

import orderRoute from "./routes/order/order.route";
import orderStateRoute from "./routes/order/orderState.route";
import paymentStateRoute from "./routes/order/paymentState.route";
import deliveryStateRoute from "./routes/order/deliveryState.route";
import paymentMethodRoute from "./routes/order/paymentMethod.route";

import orderReturnRoute from "./routes/returnRefund/orderReturn.route";
import pickupStateRoute from "./routes/returnRefund/pickupState.route";
import returnStateRoute from "./routes/returnRefund/returnState.route";
import refundStateRoute from "./routes/returnRefund/refundState.route";
import returnReasonRoute from "./routes/returnRefund/returnReason.route";

import grnRouter from "./routes/grn.route";

import { errorHandler as errorHandlerMiddleware } from "./utils/middlewares/error.middleware";
import connectDB from "./db/connectDB";
import { initAppCache } from "./configs/cache";
import { HttpError } from "./utils/errorHandler";
import { ROOT_URL } from "./configs/configs";
import { mockAllData, mockPendingOrder } from "./utils/mock";
import mongoose from "mongoose";

dotenv.config();
const requiredEnvVars = [
  "SERVER_PORT",
  "JWT_SECRET_KEY",
  "REFRESH_JWT_SECRET_KEY",
  "MONGO_URI",
  "MONGO_DB_NAME",
  "MAILTRAP_TOKEN",
  "MAILTRAP_SENDER_EMAIL",
  "MAILTRAP_SENDER_NAME",
  "CLIENT_URL",
  "TWILIO_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_AUTH_PHONE",
  "FIREBASE_USER_AVATAR_BUCKET",
  "FIREBASE_PRODUCT_IMAGE_BUCKET",
  "FIREBASE_RETURN_IMAGE_BUCKET",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_SECURE",
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_SENDER",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLIENT_URL",
];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Fatal error: ${varName} is not defined!`);
    process.exit(1);
  }
}

const app = express();
app.use(
  cors({
    origin: [process.env.CLIENT_URL!],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true, // Allow cookies to be sent with requests
    optionsSuccessStatus: 200, // For legacy browser support
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// IMPORTANT: Stripe webhook route must come BEFORE express.json()
// to receive the raw request body for signature verification.
app.use(`${ROOT_URL}/webhooks`, webhookRoute);

app.use(express.json());
app.use(cookieParser());

// Routing conventions: static first ("/", "/me"), then long dynamic ("/:userId/orders"), then short dynamic ("/:userId").
app.use(`${ROOT_URL}/auth`, authRoute);

app.use(`${ROOT_URL}/users`, userRoute);
app.use(`${ROOT_URL}/user-carts`, userCartRoute);
app.use(`${ROOT_URL}/user-addresses`, userAddressRoute);
app.use(`${ROOT_URL}/user-bank-accounts`, userBankAccountRoute);
app.use(`${ROOT_URL}/user-balance-history`, userBalanceHistoryRoute);
app.use(`${ROOT_URL}/user-payment-methods`, userPaymentMethodRoute);

app.use(`${ROOT_URL}/roles`, roleRoute);
app.use(`${ROOT_URL}/permissions`, permissionRoute);
app.use(`${ROOT_URL}/providers`, providerRoute);
app.use(`${ROOT_URL}/withdrawal-requests`, withdrawalRequestRoute);
app.use(`${ROOT_URL}/withdrawal-states`, withdrawalStateRoute);

app.use(`${ROOT_URL}/products`, productRoute);
app.use(`${ROOT_URL}/product-os`, productOsRoute);
app.use(`${ROOT_URL}/product-brands`, productBrandRoute);
app.use(`${ROOT_URL}/product-categories`, productCategoryRoute);
app.use(`${ROOT_URL}/product-models`, productModelRoute);
app.use(`${ROOT_URL}/model-variations`, modelVariationRoute);
app.use(`${ROOT_URL}/variation-instances`, variationInstanceRoute);

app.use(`${ROOT_URL}/instance-conditions`, instanceCondition);

app.use(`${ROOT_URL}/orders`, orderRoute);
app.use(`${ROOT_URL}/order-states`, orderStateRoute);
app.use(`${ROOT_URL}/payment-states`, paymentStateRoute);
app.use(`${ROOT_URL}/delivery-states`, deliveryStateRoute);
app.use(`${ROOT_URL}/payment-methods`, paymentMethodRoute);

app.use(`${ROOT_URL}/returns`, orderReturnRoute);
app.use(`${ROOT_URL}/pickup-states`, pickupStateRoute);
app.use(`${ROOT_URL}/return-states`, returnStateRoute);
app.use(`${ROOT_URL}/return-reasons`, returnReasonRoute);
app.use(`${ROOT_URL}/refund-states`, refundStateRoute);

app.use(`${ROOT_URL}/grns`, grnRouter);

app.use((req, res, next) => {
  next(
    new HttpError(
      404,
      `Request not found: ${req.originalUrl} with ${req.method} method.`
    )
  );
});
app.use((err: any, req: Request, res: Response, next: NextFunction) =>
  errorHandlerMiddleware(err, req, res, next)
);

const port = process.env.SERVER_PORT;
app.listen(port, async () => {
  // Order is matter
  console.log("🔗", "Connecting to MongoDB...");
  await connectDB();
  // await seedAllCollections(); // Init Mongo collections when first time creating a new database
  await initAppCache(); // Init application cache

  // DEV Mock pending order for testing
  // const session = await mongoose.startSession();
  // session.startTransaction();
  // try {
  //   const userId = new mongoose.Types.ObjectId("68c26d7e1a2f6587ce067968"); // me
  //   await mockPendingOrder(session, userId);
  //   await session.commitTransaction();
  //   console.log("✅", "Mock pending order created");
  // } catch (error) {
  //   await session.abortTransaction();
  //   console.log("❌ ", "Mock pending order failed:", error);
  //   process.exit(1);
  // } finally {
  //   await session.endSession();
  // }

  // await mockAllData(); // DEV Mock data for testing
  console.log("🚀", `Server is running on http://localhost:${port}`);
});
