import { Request, Response, NextFunction } from "express";
import {
  isValidDateTimeString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS } from "../../../../common/configs.common";
import { HttpError } from "../../errorHandler";

export function sanitizeBalanceHistorySearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing user balance history input...");
  const sanitizedQuery = { ...req.query };
  const { category } = sanitizedQuery;

  if (typeof category === "string") {
    sanitizedQuery.category = removeOddSpaces(category).toLowerCase();
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

export function verifyBalanceHistorySearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Validating user balance history search input...");

  let errors: string[] = [];
  try {
    const { limit, offset, category, createdAtFrom, createdAtTo } =
      req["sanitizedQuery"] || req.query;

    if (limit !== undefined && !isValidNumString(limit)) {
      errors.push("limit must be a positive number.");
    }
    if (offset !== undefined && !isValidNumString(offset)) {
      errors.push("offset must be a non-negative number.");
    }
    if (
      category !== undefined &&
      !USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS.includes(category)
    ) {
      errors.push(
        `category must be one of: ${USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS.join(
          ", "
        )}.`
      );
    }
    if (createdAtFrom !== undefined && !isValidDateTimeString(createdAtFrom)) {
      errors.push("createdAtFrom must be a valid ISO date string.");
    }
    if (createdAtTo !== undefined && !isValidDateTimeString(createdAtTo)) {
      errors.push("createdAtTo must be a valid ISO date string.");
    }
    if (
      isValidDateTimeString(createdAtFrom) &&
      isValidDateTimeString(createdAtTo) &&
      new Date(createdAtFrom) > new Date(createdAtTo)
    ) {
      errors.push(
        "createdAtFrom must be earlier than or equal to createdAtTo."
      );
    }

    if (errors.length > 0) {
      throw new HttpError(400, errors);
    }
    next();
  } catch (error) {
    next(error);
  }
}
