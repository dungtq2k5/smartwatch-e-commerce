import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errorHandler";
import {
  isValidDateTimeString,
  isValidNumString,
  removeOddSpaces,
} from "../../../common/utils.common";
import { isPresent } from "../utils";

export function sanitizeOrderInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing order input...");
  const { items } = req.body;

  // Auto accumulate items if they are in the same variation
  if (items && Array.isArray(items)) {
    const accumulatedItems = new Map<string, number>();

    for (const item of items) {
      // Ensure the item has the required properties before processing
      if (item?.variationId && typeof item.quantity === "number") {
        const existingQuantity = accumulatedItems.get(item.variationId) || 0;
        accumulatedItems.set(
          item.variationId,
          existingQuantity + item.quantity
        );
      }
    }

    // Convert the map back to an array of items
    const sanitizedItems = Array.from(
      accumulatedItems,
      ([variationId, quantity]) => ({
        variationId,
        quantity,
      })
    );

    req.body.items = sanitizedItems;
  }

  next();
}

export function sanitizeSearchOrderInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing search order input...");
  const { searchTerm } = req.query;

  if (typeof searchTerm === "string") {
    req.query.searchTerm = removeOddSpaces(searchTerm);
  }
}

export function verifyOrderInput(
  type: "create" | "update" | "search"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating order input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating order creation input...");
          const { userAddressId, items, paymentMethodId, applyUserBalance } = req.body;

          if (!isPresent(userAddressId)) {
            errors.push("User address ID is required.");
          } else if (typeof userAddressId !== "string" || !userAddressId) {
            errors.push("User address ID must be a non-empty string.");
          }
          if (!items) {
            errors.push("Items are required.");
          } else if (!Array.isArray(items) || items.length === 0) {
            errors.push("Items must be a non-empty array.");
          } else {
            items.forEach((item, index) => {
              if (!item.variationId) {
                errors.push(`Item at index ${index} is missing variation ID.`);
              } else if (
                typeof item.variationId !== "string" ||
                !item.variationId
              ) {
                errors.push(
                  `Item at index ${index} variation ID must be a non-empty string.`
                );
              }
              if (!item.quantity) {
                errors.push(`Item at index ${index} is missing quantity.`);
              } else if (
                typeof item.quantity !== "number" ||
                item.quantity <= 0
              ) {
                errors.push(
                  `Item at index ${index} quantity must be a positive number.`
                );
              }
            });
          }
          if (!isPresent(paymentMethodId)) {
            errors.push("Payment method ID is required");
          } else if (typeof paymentMethodId !== "string" || !paymentMethodId) {
            errors.push("Payment method ID must be a non-empty string.");
          }
          if (applyUserBalance !== undefined && typeof applyUserBalance !== "boolean") {
            errors.push("Apply user balance must be a boolean value.");
          }

          break;
        }
        case "update": {
          console.log("Validating order update input...");
          const { deliveryStateId, estimateReceivedDate, deliveryAddressId } =
            req.body;

          if (
            deliveryStateId !== undefined &&
            (typeof deliveryStateId !== "string" || !deliveryStateId)
          ) {
            errors.push("Delivery state ID must be a non-empty string.");
          }
          if (
            estimateReceivedDate !== undefined &&
            !isValidDateTimeString(estimateReceivedDate)
          ) {
            errors.push(
              "Estimate received date must be a valid date-time string."
            );
          }
          if (
            deliveryAddressId !== undefined &&
            (typeof deliveryAddressId !== "string" || !deliveryAddressId)
          ) {
            errors.push("Delivery address ID must be a non-empty string.");
          }
          break;
        }
        case "search": {
          console.log("Validating order search input...");
          const {
            limit,
            offset,
            searchTerm,
            deliveryStateId,
            paymentStatusId,
          } = req.query;

          if (limit !== undefined && !isValidNumString(limit)) {
            errors.push("Limit must be a valid number string.");
          }
          if (offset !== undefined && !isValidNumString(offset)) {
            errors.push("Offset must be a valid number string.");
          }
          if (
            searchTerm !== undefined &&
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("Search term must be a non-empty string.");
          }
          if (
            deliveryStateId !== undefined &&
            (typeof deliveryStateId !== "string" || !deliveryStateId)
          ) {
            errors.push("Delivery state ID must be a non-empty string.");
          }
          if (
            paymentStatusId !== undefined &&
            (typeof paymentStatusId !== "string" || !paymentStatusId)
          ) {
            errors.push("Payment status ID must be a non-empty string.");
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

export function verifyPaymentIntentInput(
  type: "create"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating payment intent input...");

    let errors: string[] = [];
    try {
      if (type === "create") {
        console.log("Validating payment intent creation input...");
        req.body = req.body ?? {}; // Since there is only one field
        const { saveCard } = req.body;

        if (saveCard !== undefined && typeof saveCard !== "boolean") {
          errors.push("Save card must be a boolean value.");
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
