import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../errorHandler";
import { isPresent } from "../../utils";
import { isValidObjectId } from "mongoose";
import {
  isValidBooleanString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { VARIATION_INSTANCE_SORT_OPTIONS } from "../../../../common/configs.common";

function sanitizeVariationSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing variation instance admin search input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm, isActive } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }
  if (typeof isActive === "string") {
    sanitizedQuery.isActive = removeOddSpaces(isActive.toLowerCase());
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

export function inputSanitizer(
  type: "admin search"
): (req: Request, res: Response, next: NextFunction) => void {
  return sanitizeVariationSearchInput;
}

export function verifyVariationInstanceInput(
  type: "create" | "update" | "admin search"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating instance input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const {
            modelVariationId,
            supplierSerialNumber,
            supplierImeiNumber,
            conditionId,
            isActive,
          } = req.body;

          if (!modelVariationId) {
            errors.push("modelVariationId is required.");
          } else if (!isValidObjectId(modelVariationId)) {
            errors.push("modelVariationId must be a valid ObjectId string.");
          }
          if (!supplierSerialNumber) {
            errors.push(
              "Variation instance supplier serial number is required."
            );
          } else if (typeof supplierSerialNumber !== "string") {
            errors.push(
              "Variation instance supplier serial number must be a none-empty string."
            );
          }
          if (
            isPresent(supplierImeiNumber) &&
            (typeof supplierImeiNumber !== "string" || !supplierImeiNumber)
          ) {
            errors.push(
              "Variation instance supplier IMEI number must be a none-empty string."
            );
          }
          if (
            isPresent(conditionId) &&
            (typeof conditionId !== "string" || !conditionId)
          ) {
            errors.push(
              "Variation instance condition ID must be a none-empty string."
            );
          }
          if (isActive !== undefined && typeof isActive !== "boolean") {
            errors.push("Variation instance isActive must be a boolean.");
          }
          break;
        }
        case "update": {
          const {
            supplierSerialNumber,
            supplierImeiNumber,
            conditionId,
            isActive,
          } = req.body;

          if (
            supplierSerialNumber !== undefined &&
            (typeof supplierSerialNumber !== "string" || !supplierSerialNumber)
          ) {
            errors.push(
              "Variation instance supplier serial number must be a none-empty string."
            );
          }
          if (
            isPresent(supplierImeiNumber) &&
            (typeof supplierImeiNumber !== "string" || !supplierImeiNumber)
          ) {
            errors.push(
              "Variation instance supplier IMEI number must be a none-empty string or null."
            );
          }
          if (
            isPresent(conditionId) &&
            (typeof conditionId !== "string" || !conditionId)
          ) {
            errors.push(
              "Variation instance condition ID must be a none-empty string."
            );
          }
          if (isActive !== undefined && typeof isActive !== "boolean") {
            errors.push("Variation instance isActive must be a boolean.");
          }
          break;
        }
        case "admin search": {
          const { limit, offset, searchTerm, conditionId, isActive, sortBy } =
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
            errors.push("searchTerm must be a non-empty string.");
          }
          if (
            conditionId !== undefined &&
            (typeof conditionId !== "string" || !conditionId)
          ) {
            errors.push("conditionId must be a non-empty string.");
          }
          if (isActive !== undefined && !isValidBooleanString(isActive)) {
            errors.push("isActive must be a valid boolean string.");
          }
          if (
            sortBy !== undefined &&
            !VARIATION_INSTANCE_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${VARIATION_INSTANCE_SORT_OPTIONS.join(
                ", "
              )}.`
            );
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
