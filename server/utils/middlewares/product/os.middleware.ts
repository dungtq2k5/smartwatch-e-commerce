import { Request, Response, NextFunction } from "express";
import { sanitizeProductInput as sanitizeOsInput } from "./product.middleware";
import { isPresent, isValidImgUrl } from "../../utils";
import { HttpError } from "../../errorHandler";
import {
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";

function sanitizeOsSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing os search input...");

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
  const { osIds } = req.body;

  // Auto remove duplicates
  if (osIds && Array.isArray(osIds)) {
    req.body.osIds = Array.from(new Set(osIds));
  }

  next();
}

export function inputSanitizer(
  type: "os" | "admin search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "os":
      return sanitizeOsInput;
    case "admin search":
      return sanitizeOsSearchInput;
    case "delete many":
      return sanitizeDeleteBulkInput;
  }
}

export function verifyOsInput(
  type: "create" | "update" | "admin search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    console.log("▶️ ", "Validating product OS input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name, logoUrl, description } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (typeof name !== "string") {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(logoUrl) &&
            !(await isValidImgUrl(logoUrl, "product-logo"))
          ) {
            errors.push("logo URL must be a valid image URL.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name, logoUrl, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(logoUrl) &&
            !(await isValidImgUrl(logoUrl, "product-logo"))
          ) {
            errors.push("logo URL must be a valid image URL.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string or null.");
          }
          break;
        }
        case "admin search": {
          console.log("Validating admin os search input...");
          const { limit, offset, searchTerm } =
            req["sanitizedQuery"] || req.query;

          if (limit !== undefined && !isValidNumString(limit)) {
            errors.push("limit must be a valid number string.");
          }
          if (offset !== undefined && !isValidNumString(offset)) {
            errors.push("offset must be a valid number string.");
          }
          if (
            searchTerm !== undefined &&
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("search term must be a non-empty string.");
          }

          break;
        }
        case "delete many": {
          console.log("Validating delete many input...");
          const { osIds } = req.body;

          if (!Array.isArray(osIds) || osIds.length === 0) {
            errors.push("osIds must be a non-empty array.");
          } else {
            for (const [idx, id] of osIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `osIds[${idx}] is invalid. Each osId must be a non-empty string.`,
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
