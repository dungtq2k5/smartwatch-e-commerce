import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../errorHandler";
import { isPresent } from "../../utils";
import { isValidObjectId } from "mongoose";

export function verifyVariationInstanceInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating instance input...");

    let errors: string[] = [];
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
