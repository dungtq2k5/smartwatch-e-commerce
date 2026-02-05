import { Request, Response, NextFunction } from "express";
import {
  isValidEmail,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { HttpError } from "../../errorHandler";
import { isValidPhoneNumber } from "libphonenumber-js";

export function sanitizeProviderInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing provider input...");
  const { fullName, email } = req.body;

  if (typeof fullName === "string") {
    req.body.fullName = removeOddSpaces(fullName);
  }
  if (typeof email === "string") {
    req.body.email = removeOddSpaces(email).toLowerCase();
  }

  next();
}

export function verifyProviderInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating provider input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating provider creation input...");
          const { fullName, email, phoneNumber } = req.body;

          if (!fullName) {
            errors.push("Full name is required.");
          } else if (typeof fullName !== "string") {
            errors.push("Full name must be a non-empty string.");
          }
          if (!email) {
            errors.push("Email is required.");
          } else if (!isValidEmail(email)) {
            errors.push("Email is not valid.");
          }
          if (!phoneNumber) {
            errors.push("Phone number is required.");
          } else if (!isValidPhoneNumber(phoneNumber)) {
            errors.push("Phone number is not valid.");
          }
          break;
        }
        case "update": {
          console.log("Validating provider update input...");
          const { fullName, email, phoneNumber } = req.body;

          if (
            fullName !== undefined &&
            (typeof fullName !== "string" || !fullName)
          ) {
            errors.push("Full name must be a non-empty string.");
          }
          if (email !== undefined && !isValidEmail(email)) {
            errors.push("Email is not valid.");
          }
          if (phoneNumber !== undefined && !isValidPhoneNumber(phoneNumber)) {
            errors.push("Phone number is not valid.");
          }
          break;
        }
      }

      if (errors.length > 0) {
        throw new HttpError(400, errors);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
