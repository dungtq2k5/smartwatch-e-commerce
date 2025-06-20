import { Response, Request, NextFunction } from "express";
import { ErrorResponse } from "../../../common/types.common";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
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
}
