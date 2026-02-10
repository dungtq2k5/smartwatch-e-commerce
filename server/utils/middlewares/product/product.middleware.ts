import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidProductName,
  isValidNumString,
  removeAllSpaces,
  isValidBooleanString,
} from "../../../../common/utils.common";
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_SEARCH_SORT_OPTIONS,
  PRODUCT_TYPES,
} from "../../../../common/configs.common";
import { HttpError } from "../../errorHandler";
import { isPresent, isValidIdArray, isValidImgUrls } from "../../utils";

export function sanitizeProductInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing product input...");
  const { name, type, description } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof type === "string") {
    req.body.type = removeOddSpaces(type).toLowerCase();
  }
  if (typeof description === "string") {
    req.body.description = removeOddSpaces(description);
  }

  next();
}

function sanitizeProductSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing product search input...");

  // Since req.query can't be modified so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const {
    searchTerm,
    type,
    stopSelling,
    brandId: brandIds,
    categoryId: categoryIds,
  } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }
  if (typeof type === "string") {
    sanitizedQuery.type = removeOddSpaces(type).toLowerCase();
  }
  if (typeof stopSelling === "string") {
    sanitizedQuery.stopSelling = removeAllSpaces(stopSelling.toLowerCase());
  }
  if (brandIds) {
    sanitizedQuery.brandIds = Array.isArray(brandIds)
      ? [...new Set(brandIds)]
      : [brandIds];
  }
  if (categoryIds) {
    sanitizedQuery.categoryIds = Array.isArray(categoryIds)
      ? [...new Set(categoryIds)]
      : [categoryIds];
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeProductDetailQuery(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing product detail query input...");

  const sanitizedQuery = { ...req.query };
  const { modelStopSelling, variationStopSelling } = sanitizedQuery;

  if (typeof modelStopSelling === "string") {
    sanitizedQuery.modelStopSelling = removeAllSpaces(
      modelStopSelling.toLowerCase(),
    );
  }
  if (typeof variationStopSelling === "string") {
    sanitizedQuery.variationStopSelling = removeAllSpaces(
      variationStopSelling.toLowerCase(),
    );
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
  const { productIds } = req.body;

  // Auto remove duplicates
  if (productIds && Array.isArray(productIds)) {
    req.body.productIds = Array.from(new Set(productIds));
  }

  next();
}

export function inputSanitizer(
  type:
    | "product"
    | "product search"
    | "admin product search"
    | "product details"
    | "admin product details"
    | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "product":
      return sanitizeProductInput;
    case "product search":
    case "admin product search":
      return sanitizeProductSearchInput;
    case "product details":
    case "admin product details":
      return sanitizeProductDetailQuery;
    case "delete many":
      return sanitizeDeleteBulkInput;
  }
}

export function verifyProductInput(
  type:
    | "create"
    | "update"
    | "search"
    | "admin search"
    | "details"
    | "admin details"
    | "delete many",
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    console.log("▶️ ", "Validating product input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating product creation input...");
          const {
            name,
            type,
            brandId,
            categoryId,
            imageUrls,
            description,
            stopSelling,
            basePriceCents,
          } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`,
            );
          }
          if (!type) {
            errors.push("type is required.");
          } else if (!PRODUCT_TYPES.includes(type)) {
            errors.push(
              `type must be one of the following: ${PRODUCT_TYPES.join(", ")}`,
            );
          }
          if (!brandId) {
            errors.push("ID is required.");
          }
          if (!categoryId) {
            errors.push("ID is required.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product-image"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (typeof description !== "string" || !description) {
            errors.push("description is required.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          if (basePriceCents === undefined) {
            errors.push("base price is required.");
          } else if (typeof basePriceCents !== "number" || basePriceCents < 0) {
            errors.push("base price must be a non-negative number.");
          }
          break;
        }
        case "update": {
          console.log("Validating product update input...");
          const {
            name,
            type,
            brandId,
            categoryId,
            imageUrls,
            description,
            stopSelling,
            basePriceCents,
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`,
            );
          }
          if (type !== undefined && !PRODUCT_TYPES.includes(type)) {
            errors.push(
              `type must be one of the following: ${PRODUCT_TYPES.join(", ")}`,
            );
          }
          if (
            brandId !== undefined &&
            (typeof brandId !== "string" || !brandId)
          ) {
            errors.push("ID must be a non-empty string.");
          }
          if (
            categoryId !== undefined &&
            (typeof categoryId !== "string" || !categoryId)
          ) {
            errors.push("ID must be a non-empty string.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product-image"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (
            description !== undefined &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          if (
            basePriceCents !== undefined &&
            (typeof basePriceCents !== "number" || basePriceCents < 0)
          ) {
            errors.push("base price must be a non-negative number.");
          }
          break;
        }
        case "search":
        case "admin search": {
          console.log("Validating product search input...");
          const {
            limit,
            offset,
            searchTerm,
            type,
            brandIds,
            categoryIds,
            stopSelling,
            priceCentsMin,
            priceCentsMax,
            sortBy,
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
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("search term must be a non-empty string.");
          }
          if (type !== undefined && !PRODUCT_TYPES.includes(type)) {
            errors.push(
              `type must be one of the following: ${PRODUCT_TYPES.join(", ")}`,
            );
          }
          if (brandIds !== undefined && !isValidIdArray(brandIds)) {
            errors.push("brandIds must be an array of non-empty string IDs.");
          }
          if (categoryIds !== undefined && !isValidIdArray(categoryIds)) {
            errors.push(
              "categoryIds must be an array of non-empty string IDs.",
            );
          }
          if (stopSelling !== undefined && !isValidBooleanString(stopSelling)) {
            errors.push("stopSelling must be a boolean string.");
          }
          if (priceCentsMin !== undefined) {
            if (!isValidNumString(priceCentsMin)) {
              errors.push("priceCentsMin must be a valid number string.");
            } else if (Number.parseInt(priceCentsMin, 10) < 0) {
              errors.push("priceCentsMin must be a non-negative number.");
            }
          }
          if (priceCentsMax !== undefined) {
            if (!isValidNumString(priceCentsMax)) {
              errors.push("priceCentsMax must be a valid number string.");
            } else if (Number.parseInt(priceCentsMax, 10) < 0) {
              errors.push("priceCentsMax must be a non-negative number.");
            }
          }
          if (
            priceCentsMin !== undefined &&
            priceCentsMax !== undefined &&
            Number.parseInt(priceCentsMin, 10) >
              Number.parseInt(priceCentsMax, 10)
          ) {
            errors.push("priceCentsMin cannot be greater than priceCentsMax.");
          }
          if (
            sortBy !== undefined &&
            !PRODUCT_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${PRODUCT_SEARCH_SORT_OPTIONS.join(
                ", ",
              )}`,
            );
          }
          break;
        }
        case "details":
        case "admin details": {
          console.log("Validating product details input...");
          const { modelStopSelling, variationStopSelling } =
            req["sanitizedQuery"] || req.query;

          if (
            modelStopSelling !== undefined &&
            !["true", "false"].includes(modelStopSelling)
          ) {
            errors.push("modelStopSelling must be a boolean string.");
          }
          if (
            variationStopSelling !== undefined &&
            !["true", "false"].includes(variationStopSelling)
          ) {
            errors.push("variationStopSelling must be a boolean string.");
          }
          break;
        }
        case "delete many": {
          console.log("Validating delete many input...");
          const { productIds } = req.body;

          if (!Array.isArray(productIds) || productIds.length === 0) {
            errors.push("productIds must be a non-empty array.");
          } else {
            for (const [idx, id] of productIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `productIds[${idx}] is invalid. Each productId must be a non-empty string.`,
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
