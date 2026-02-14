import { Request, Response, NextFunction } from "express";
import {
  isValidEmail,
  isValidNumString,
  removeAllSpaces,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { HttpError } from "../../errorHandler";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PROVIDER_SEARCH_SORT_OPTIONS } from "../../../../common/configs.common";

function sanitizeProviderInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing provider input...");
  const { fullName, email, phoneNumber } = req.body;

  if (typeof fullName === "string") {
    req.body.fullName = removeOddSpaces(fullName);
  }
  if (typeof email === "string") {
    req.body.email = removeAllSpaces(email).toLowerCase();
  }
  if (typeof phoneNumber === "string") {
    req.body.phoneNumber = removeOddSpaces(phoneNumber);
  }

  next();
}

function sanitizeProviderSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing provider search input...");
  // Since req.query can't be modified so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeDeleteBulkInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing delete many input...");
  const { providerIds } = req.body;

  // Auto remove duplicates
  if (providerIds && Array.isArray(providerIds)) {
    const uniqueProviderIds = Array.from(new Set(providerIds));
    req.body.providerIds = uniqueProviderIds;
  }

  next();
}

export function inputSanitizer(
  type: "create" | "update" | "search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "create":
    case "update":
      return sanitizeProviderInput;
    case "search":
      return sanitizeProviderSearchInput;
    case "delete many":
      return sanitizeDeleteBulkInput;
  }
}

export function verifyProviderInput(
  type: "create" | "update" | "search" | "delete many",
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
        case "search": {
          console.log("Validating provider search input...");
          const { limit, offset, searchTerm, sortBy } =
            req["sanitizedQuery"] || req.query;

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
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("searchTerm must be a non-empty string.");
          }
          if (
            sortBy !== undefined &&
            !PROVIDER_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${PROVIDER_SEARCH_SORT_OPTIONS.join(", ")}.`,
            );
          }

          break;
        }
        case "delete many": {
          console.log("Validating delete many providers input...");
          const { providerIds } = req.body;

          if (!Array.isArray(providerIds) || providerIds.length === 0) {
            errors.push("providerIds must be a non-empty array.");
          } else {
            for (const [idx, id] of providerIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `providerIds[${idx}] is invalid. Each providerId must be a non-empty string.`,
                );
              }
            }
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
