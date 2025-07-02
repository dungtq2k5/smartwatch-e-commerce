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
import { errorHandler } from "./utils/middlewares/error.middleware";
import connectDB from "./db/connectDB";
import { initAppCache } from "./configs/cache";

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
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow cookies to be sent with requests
    optionsSuccessStatus: 200, // For legacy browser support
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/roles", roleRoute);
app.use("/api/products", productRoute);
app.use("/api/product-brands", productBrandRoute);
app.use("/api/product-categories", productCategoryRoute);
app.use("/api/product-os", productOsRoute);

app.use((err: any, req: Request, res: Response, next: NextFunction) =>
  errorHandler(err, req, res, next)
);

const port = process.env.SERVER_PORT;
app.listen(port, async () => {
  console.log("🔗", "Connecting to MongoDB...");
  await connectDB();
  // await seedAllCollections(); // Init Mongo collections when first time running the server
  await initAppCache(); // Init application cache
  console.log("🚀", `Server is running on http://localhost:${port}`);
});
