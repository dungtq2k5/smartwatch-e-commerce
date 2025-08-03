import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../errorHandler";
import { isValidDateTimeString } from "../../../common/utils.common";

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

export function verifyOrderInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating order input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating order creation input...");
          const { userAddressId, items } = req.body;

          if (!userAddressId) {
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
      }

      if (errors.length > 0) {
        return next(errorHandler(400, errors));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
