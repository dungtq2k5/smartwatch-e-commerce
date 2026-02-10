import { NextFunction, Request, Response } from "express";
import {
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { HttpError } from "../../errorHandler";
import { isPresent, isValidImgUrl } from "../../utils";
import { sanitizeProductInput as sanitizeBrandInput } from "./product.middleware";

function sanitizeBrandSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing brand search input...");

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
  const { brandIds } = req.body;

  // Auto remove duplicates
  if (brandIds && Array.isArray(brandIds)) {
    req.body.brandIds = Array.from(new Set(brandIds));
  }

  next();
}

export function inputSanitizer(
  type: "brand" | "admin search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "brand":
      return sanitizeBrandInput;
    case "admin search":
      return sanitizeBrandSearchInput;
    case "delete many":
      return sanitizeDeleteBulkInput;
  }
}

export function verifyBrandInput(
  type: "create" | "update" | "admin search" | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    console.log("▶️ ", "Validating product brand input...");

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
            errors.push("logo URL must be a valid image URL or null.");
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
          console.log("Validating admin brand search input...");
          const { limit, offset, searchTerm } =
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
            errors.push("search term must be a non-empty string.");
          }

          break;
        }
        case "delete many": {
          console.log("Validating delete many input...");
          const { brandIds } = req.body;

          if (!Array.isArray(brandIds) || brandIds.length === 0) {
            errors.push("brandIds must be a non-empty array.");
          } else {
            for (const [idx, id] of brandIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `brandIds[${idx}] is invalid. Each brandId must be a non-empty string.`,
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
