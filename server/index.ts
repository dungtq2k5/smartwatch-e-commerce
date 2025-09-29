import dotenv from "dotenv";
import { seedAllCollections } from "./utils/seedings";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.route";
import userRoute from "./routes/user.route";
import roleRoute from "./routes/role.route";
import productRoute from "./routes/product/product.route";
import productBrandRoute from "./routes/product/brand.route";
import productCategoryRoute from "./routes/product/category.route";
import productOsRoute from "./routes/product/os.route";
import orderRoutes from "./routes/order/order.route";
import webhookRoutes from "./routes/webhook.route";
import providerRoutes from "./routes/provider.route";
import paymentMethodRoutes from "./routes/order/paymentMethod.route";
import paymentStateRoutes from "./routes/order/paymentState.route";
import deliveryStateRoutes from "./routes/order/deliveryState.route";
import orderStateRoutes from "./routes/order/orderState.route";
import pickupStateRoutes from "./routes/returnRefund/pickupState.route";
import returnStateRoutes from "./routes/returnRefund/returnState.route";
import returnReasonRoutes from "./routes/returnRefund/returnReason.route";
import refundStateRoutes from "./routes/returnRefund/refundState.route";
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
  "MONGO_URI",
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
app.use(`${ROOT_URL}/webhooks`, webhookRoutes);

app.use(express.json());
app.use(cookieParser());

app.use(`${ROOT_URL}/auth`, authRoute);
app.use(`${ROOT_URL}/users`, userRoute);
app.use(`${ROOT_URL}/roles`, roleRoute);
app.use(`${ROOT_URL}/products/brands`, productBrandRoute);
app.use(`${ROOT_URL}/products/categories`, productCategoryRoute);
app.use(`${ROOT_URL}/products/os`, productOsRoute);
app.use(`${ROOT_URL}/products`, productRoute);
app.use(`${ROOT_URL}/orders`, orderRoutes);
app.use(`${ROOT_URL}/payment-methods`, paymentMethodRoutes);
app.use(`${ROOT_URL}/payment-states`, paymentStateRoutes);
app.use(`${ROOT_URL}/delivery-states`, deliveryStateRoutes);
app.use(`${ROOT_URL}/order-states`, orderStateRoutes);
app.use(`${ROOT_URL}/pickup-states`, pickupStateRoutes);
app.use(`${ROOT_URL}/return-states`, returnStateRoutes);
app.use(`${ROOT_URL}/return-reasons`, returnReasonRoutes);
app.use(`${ROOT_URL}/refund-states`, refundStateRoutes);
app.use(`${ROOT_URL}/providers`, providerRoutes);

app.use((req, res, next) => {
  next(new HttpError(404, `Request not found: ${req.originalUrl}`));
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
  //   console.log("❌", "Mock pending order failed:", error);
  //   process.exit(1);
  // } finally {
  //   await session.endSession();
  // }

  // await mockAllData(); // DEV Mock data for testing
  console.log("🚀", `Server is running on http://localhost:${port}`);
});
