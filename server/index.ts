import dotenv from "dotenv";
import { seedAllCollection } from "./utils/seedings";
import express, { Response } from "express";
import cookieParser from "cookie-parser";
import { ErrorResponse } from "../common/types.common";

dotenv.config();
const requiredEnvVars = [
  "SERVER_PORT",
];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Fatal error: ${varName} is not defined!`);
    process.exit(1);
  }
}

// Init some Mongo collections when first time running the server
await seedAllCollection();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use((err: any, res: Response): void => {
  console.log("❌", "Error handler catching and sending process...");
  let statusCode = err.statusCode || 500;
  let msg = err.message || "Internal Server Error";

  // Mongoose duplicate key error
  if (err.code === 1000 && err.keyValue) {
    const dupField = Object.keys(err.keyValue)[0];
    const dupVal = err.keyValue[dupField];
    statusCode = 409;
    msg = `${dupField} '${dupVal}' already exists!`;
  }

  res.status(statusCode).json({
    success: false,
    message: msg,
  } as ErrorResponse);
  console.log("...error handler send response completed.");
});