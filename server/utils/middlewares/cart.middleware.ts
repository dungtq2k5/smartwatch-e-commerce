import { Request, Response, NextFunction } from "express";
import { isPresent } from "..//utils";
import { HttpError } from "../errorHandler";

export function sanitizeCartInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing cart input...");
  const { items } = req.body; // { variationId: string, quantity: number | undefined }[]

  // Auto accumulate quantity if they are in the same variationId
  if (items && Array.isArray(items)) {
    const accumulatedItems = new Map<string, number>();

    for (const item of items) {
      // Ensure the item has the required properties before processing
      if (
        item?.variationId &&
        ["number", "undefined"].includes(typeof item.quantity)
      ) {
        const existingQuantity = accumulatedItems.get(item.variationId) || 0;
        accumulatedItems.set(
          item.variationId,
          existingQuantity + item.quantity || 1
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

export function verifyCartInput(
  type: "create" | "update" | "create many"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating cart input...");

    const errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating create cart input...");
          const { variationId, quantity } = req.body;

          if (!variationId) {
            errors.push("variationId is required.");
          } else if (typeof variationId !== "string") {
            errors.push("variationId must be a non-empty string.");
          }
          if (
            quantity !== undefined &&
            (typeof quantity !== "number" || quantity < 1)
          ) {
            errors.push("quantity must be a positive number.");
          }
          break;
        }
        case "update": {
          console.log("Validating update cart input...");
          const { quantity } = req.body;

          if (!isPresent(quantity)) {
            errors.push("quantity is required.");
          } else if (typeof quantity !== "number" || quantity < 0) {
            errors.push("quantity must be a non-negative number.");
          }
          break;
        }
        case "create many": {
          console.log("Validating create many cart input...");
          const { items } = req.body;

          if (!Array.isArray(items) || items.length === 0) {
            errors.push("Request body must be a non-empty array.");
          } else {
            for (const [idx, item] of items.entries()) {
              if (!item.variationId) {
                errors.push(`Item at index ${idx} is missing variationId.`);
              } else if (
                typeof item.variationId !== "string" ||
                !item.variationId
              ) {
                errors.push(
                  `Item at index ${idx} has invalid variationId. It must be a non-empty string.`
                );
              }
              if (
                item.quantity !== undefined &&
                (typeof item.quantity !== "number" || item.quantity < 1)
              ) {
                errors.push(
                  `Item at index ${idx} has invalid quantity. It must be a positive number.`
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
