import { Request, Response, NextFunction } from "express";
import {
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { HttpError } from "../../errorHandler";
import { isPresent } from "../../utils";

export function sanitizeWithdrawalInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing withdrawal request input...");
  const notes = req.body?.notes;

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

export function verifyWithdrawalRequestInput(
  type: "create" | "search" | "approve request" | "reject request"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating withdrawal request input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating withdrawal request creation input...");
          const { amountCents, bankAccountId } = req.body;

          if (!amountCents) {
            errors.push("amountCents is required.");
          } else if (typeof amountCents !== "number" || amountCents <= 0) {
            errors.push("amountCents must be a positive number.");
          }
          if (!bankAccountId) {
            errors.push("bankAccountId is required.");
          } else if (typeof bankAccountId !== "string") {
            errors.push("bankAccountId must be a string.");
          }

          break;
        }
        case "search": {
          console.log("Validating withdrawal request search input...");
          const { limit, offset } = req.query;

          if (limit !== undefined && !isValidNumString(limit)) {
            errors.push("limit must be a valid number string.");
          }
          if (offset !== undefined && !isValidNumString(offset)) {
            errors.push("offset must be a valid number string.");
          }
          break;
        }
        case "approve request":
        case "reject request": {
          console.log("Validating withdrawal request state update input...");
          const notes = req.body?.notes;

          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("notes must be a non-empty string.");
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
