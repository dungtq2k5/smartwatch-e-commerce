import { Request, Response, NextFunction } from "express";
import {
  isValidDateTimeString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { HttpError } from "../../errorHandler";
import { isArrayOfNonEmptyStrings, isPresent } from "../../utils";
import {
  WITHDRAWAL_METHODS,
  WITHDRAWAL_SEARCH_SORT_OPTIONS,
} from "../../../../common/configs.common";

export function sanitizeWithdrawalInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing withdrawal request input...");
  const notes = req.body?.notes;

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

export function sanitizeWithdrawalSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing withdrawal request search input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const {
    searchTerm,
    stateId: stateIds, // In url query, multiple stateId can be provided like ?stateId=1&stateId=2
    currency,
    withdrawalMethod,
  } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }

  if (Array.isArray(stateIds)) {
    sanitizedQuery.stateIds = [...new Set(stateIds)];
  } else {
    sanitizedQuery.stateIds = stateIds ? [stateIds] : [];
  }
  delete sanitizedQuery.stateId;

  if (typeof currency === "string") {
    sanitizedQuery.currency = removeOddSpaces(currency);
  }

  if (typeof withdrawalMethod === "string") {
    sanitizedQuery.withdrawalMethod = removeOddSpaces(withdrawalMethod);
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

export function inputSanitizer(
  type: "update" | "admin search",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "update":
      return sanitizeWithdrawalInput;
    case "admin search":
      return sanitizeWithdrawalSearchInput;
  }
}

export function verifyWithdrawalRequestInput(
  type:
    | "create"
    | "search"
    | "approve request"
    | "reject request"
    | "cancel request"
    | "admin search",
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
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

          if (limit !== undefined) {
            if (!isValidNumString(limit)) {
              errors.push("limit must be a valid number string.");
            } else if (Number(limit) <= 0) {
              errors.push("limit must be greater than 0.");
            }
          }
          if (offset !== undefined) {
            if (!isValidNumString(offset)) {
              errors.push("offset must be a valid number string.");
            } else if (Number(offset) < 0) {
              errors.push("offset must be greater than or equal to 0.");
            }
          }
          break;
        }
        case "approve request":
        case "reject request":
        case "cancel request": {
          console.log("Validating withdrawal request state update input...");
          const notes = req.body?.notes;

          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("notes must be a non-empty string.");
          }
          break;
        }
        case "admin search": {
          console.log(
            "Validating withdrawal request search input for admin...",
          );
          const {
            limit,
            offset,
            searchTerm,
            sortBy,
            stateIds,
            amountCentsMin,
            amountCentsMax,
            currency,
            withdrawalMethod,
            createdAtFrom,
            createdAtTo,
          } = req["sanitizedQuery"] || req.query;

          if (limit !== undefined) {
            if (!isValidNumString(limit)) {
              errors.push("limit must be a valid number string.");
            } else if (Number(limit) <= 0) {
              errors.push("limit must be greater than 0.");
            }
          }
          if (offset !== undefined) {
            if (!isValidNumString(offset)) {
              errors.push("offset must be a valid number string.");
            } else if (Number(offset) < 0) {
              errors.push("offset must be greater than or equal to 0.");
            }
          }
          if (
            searchTerm !== undefined &&
            (typeof searchTerm !== "string" || !searchTerm.trim())
          ) {
            errors.push("searchTerm must be a non-empty string.");
          }
          if (
            sortBy !== undefined &&
            !WITHDRAWAL_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${WITHDRAWAL_SEARCH_SORT_OPTIONS.join(", ")}.`,
            );
          }
          if (stateIds !== undefined && !isArrayOfNonEmptyStrings(stateIds)) {
            errors.push("stateIds must be an array of non-empty strings.");
          }
          if (amountCentsMin !== undefined) {
            if (!isValidNumString(amountCentsMin)) {
              errors.push("amountCentsMin must be a valid number string.");
            } else if (Number(amountCentsMin) < 0) {
              errors.push("amountCentsMin must be greater than or equal to 0.");
            }
          }
          if (amountCentsMax !== undefined) {
            if (!isValidNumString(amountCentsMax)) {
              errors.push("amountCentsMax must be a valid number string.");
            } else if (Number(amountCentsMax) < 0) {
              errors.push("amountCentsMax must be greater than or equal to 0.");
            }
          }
          if (
            amountCentsMin !== undefined &&
            amountCentsMax !== undefined &&
            Number(amountCentsMin) > Number(amountCentsMax)
          ) {
            errors.push(
              "amountCentsMin cannot be greater than amountCentsMax.",
            );
          }
          if (
            currency !== undefined &&
            (typeof currency !== "string" || !currency)
          ) {
            errors.push("currency must be a non-empty string.");
          }
          if (
            withdrawalMethod !== undefined &&
            !WITHDRAWAL_METHODS.includes(withdrawalMethod)
          ) {
            errors.push(
              `withdrawalMethod must be one of the following: ${WITHDRAWAL_METHODS.join(", ")}.`,
            );
          }
          if (
            createdAtFrom !== undefined &&
            !isValidDateTimeString(createdAtFrom)
          ) {
            errors.push("createdAtFrom must be a valid ISO date-time string.");
          }
          if (
            createdAtTo !== undefined &&
            !isValidDateTimeString(createdAtTo)
          ) {
            errors.push("createdAtTo must be a valid ISO date-time string.");
          }
          if (
            createdAtFrom !== undefined &&
            createdAtTo !== undefined &&
            new Date(createdAtFrom) > new Date(createdAtTo)
          ) {
            errors.push("createdAtFrom cannot be later than createdAtTo.");
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
