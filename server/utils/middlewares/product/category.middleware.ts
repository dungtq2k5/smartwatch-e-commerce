import { Request, Response, NextFunction } from "express";
import { sanitizeProductInput as sanitizeCategoryInput } from "./product.middleware";
import { isPresent } from "../../utils";
import { HttpError } from "../../errorHandler";
import {
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";

function sanitizeCategorySearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing category search input...");

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
  const { categoryIds } = req.body;

  // Auto remove duplicates
  if (categoryIds && Array.isArray(categoryIds)) {
    req.body.categoryIds = Array.from(new Set(categoryIds));
  }

  next();
}

export function inputSanitizer(
  type: "category" | "admin search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "category":
      return sanitizeCategoryInput;
    case "admin search":
      return sanitizeCategorySearchInput;
    case "delete many":
      return sanitizeDeleteBulkInput;
  }
}

export function verifyCategoryInput(
  type: "create" | "update" | "admin search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating product category input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name, description } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (typeof name !== "string") {
            errors.push("name must be a non-empty string.");
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
          const { name, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a non-empty string.");
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
          console.log("Validating admin category search input...");
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
          const { categoryIds } = req.body;

          if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
            errors.push("categoryIds must be a non-empty array.");
          } else {
            for (const [idx, id] of categoryIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `categoryIds[${idx}] is invalid. Each categoryId must be a non-empty string.`,
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
