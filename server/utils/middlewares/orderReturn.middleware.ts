import { Request, Response, NextFunction } from "express";
import {
  isValidBuyerReturnReason,
  isValidDateTimeString,
  isValidNumString,
  removeAllSpaces,
  removeOddSpaces,
} from "../../../common/utils.common";
import { isPresent, isValidImgUrls } from "../utils";
import { BUYER_RETURN_REASON_HINT_MESSAGE } from "../../../common/configs.common";
import { HttpError } from "../errorHandler";

function sanitizeOrderReturnInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing order return input...");
  const {
    buyerReason,
    items, // { variationId: string, instanceIds: string[] }[] | "all"
    notes, // For updating return state
  } = req.body;

  if (typeof buyerReason === "string") {
    req.body.buyerReason = removeOddSpaces(buyerReason);
  }

  // Auto accumulate instanceIds if they are in the same variation
  if (items) {
    if (Array.isArray(items)) {
      const accumulatedItems = new Map<string, Set<string>>();

      for (const item of items) {
        // Ensure the item has the required properties before processing
        if (item?.variationId && Array.isArray(item.instanceIds)) {
          const existingInstanceIds =
            accumulatedItems.get(item.variationId) || new Set<string>();
          item.instanceIds.forEach((id: string) => existingInstanceIds.add(id)); // Because using Set -> no duplicate when adding
          accumulatedItems.set(item.variationId, existingInstanceIds);
        }
      }

      // Convert the map back to an array of items
      const sanitizedItems = Array.from(
        accumulatedItems,
        ([variationId, idSet]) => ({
          variationId,
          instanceIds: Array.from(idSet),
        })
      );

      req.body.items = sanitizedItems;
    } else if (typeof items === "string") {
      req.body.items = removeAllSpaces(items).toLowerCase();
    }
  }

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

function sanitizeOrderReturnSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing search order return input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

export function inputSanitizer(
  type: "order return" | "order return search"
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "order return":
      return sanitizeOrderReturnInput;
    case "order return search":
      return sanitizeOrderReturnSearchInput;
  }
}

export function verifyOrderReturnInput(
  type: "create" | "update" | "update state" | "update pickup state" | "search"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating order return input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating order return creation input...");
          const {
            reasonId,
            imageUrls,
            buyerReason,
            userAddressIdToPickup,
            estimatePickupDate,
            items,
          } = req.body; // items: { variationId: string, instanceIds: string[] }[] | "all"

          if (!isPresent(reasonId)) {
            errors.push("Reason ID is required.");
          } else if (typeof reasonId !== "string" || !reasonId) {
            errors.push("Reason ID must be a non-empty string.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "order return"))
          ) {
            errors.push("Image URLs must be an array of valid image URLs.");
          }
          if (isPresent(buyerReason)) {
            if (typeof buyerReason !== "string" || !buyerReason) {
              errors.push("Buyer reason must be a non-empty string.");
            } else if (!isValidBuyerReturnReason(buyerReason)) {
              errors.push(
                `Buyer reason is invalid (${BUYER_RETURN_REASON_HINT_MESSAGE}).`
              );
            }
          }
          if (!isPresent(userAddressIdToPickup)) {
            errors.push("Pickup address ID is required.");
          } else if (
            typeof userAddressIdToPickup !== "string" ||
            !userAddressIdToPickup
          ) {
            errors.push("Pickup address ID must be a non-empty string.");
          }
          if (
            !isPresent(estimatePickupDate) &&
            isValidDateTimeString(estimatePickupDate)
          ) {
            errors.push(
              "Estimated pickup date must be a valid date-time string."
            );
          }
          if (!isPresent(items)) {
            errors.push("Items are required.");
          } else if (
            items !== "all" &&
            (!Array.isArray(items) || items.length === 0)
          ) {
            errors.push('Items must be "all" or a non-empty array.');
          } else if (Array.isArray(items)) {
            items.forEach((item, idx) => {
              if (!item.variationId) {
                errors.push(`Item at index ${idx} is missing variation ID.`);
              } else if (
                typeof item.variationId !== "string" ||
                !item.variationId
              ) {
                errors.push(
                  `Item at index ${idx} variation ID must be a non-empty string.`
                );
              }
              if (!item.instanceIds) {
                errors.push(`Item at index ${idx} is missing instance IDs.`);
              } else if (
                !Array.isArray(item.instanceIds) ||
                item.instanceIds.length === 0
              ) {
                errors.push(
                  `Item at index ${idx} instance IDs must be a non-empty array.`
                );
              } else {
                item.instanceIds.forEach((id: any, idIdx: number) => {
                  if (typeof id !== "string" || !id) {
                    errors.push(
                      `Item at index ${idx} instance ID at index ${idIdx} must be a non-empty string.`
                    );
                  }
                });
              }
            });
          }
          break;
        }
        case "update": {
          console.log("Validating order return update input...");
          const {
            reasonId,
            imageUrls,
            buyerReason,
            userAddressIdToPickup,
            estimatePickupDate,
            stateId,
          } = req.body;

          if (
            reasonId !== undefined &&
            (typeof reasonId !== "string" || !reasonId)
          ) {
            errors.push("Reason ID must be a non-empty string.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "order return"))
          ) {
            errors.push("Image URLs must be an array of valid image URLs.");
          }
          if (isPresent(buyerReason)) {
            if (typeof buyerReason !== "string" || !buyerReason) {
              errors.push("Buyer reason must be a non-empty string.");
            } else if (!isValidBuyerReturnReason(buyerReason)) {
              errors.push(
                `Buyer reason is invalid (${BUYER_RETURN_REASON_HINT_MESSAGE}).`
              );
            }
          }
          if (
            userAddressIdToPickup !== undefined &&
            (typeof userAddressIdToPickup !== "string" ||
              !userAddressIdToPickup)
          ) {
            errors.push("Pickup address ID must be a non-empty string.");
          }
          if (
            estimatePickupDate !== undefined &&
            !isValidDateTimeString(estimatePickupDate)
          ) {
            errors.push(
              "Estimated pickup date must be a valid date-time string."
            );
          }
          if (
            stateId !== undefined &&
            (typeof stateId !== "string" || !stateId)
          ) {
            errors.push("State ID must be a non-empty string.");
          }
          break;
        }
        case "update state": {
          console.log("Validating order return state update input...");
          const { returnStateId, notes } = req.body;

          if (!isPresent(returnStateId)) {
            errors.push("Return state ID is required.");
          } else if (typeof returnStateId !== "string" || !returnStateId) {
            errors.push("Return state ID must be a non-empty string.");
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          break;
        }
        case "update pickup state": {
          console.log("Validating order return pickup state update input...");
          const { pickupStateId, estimatePickupDate, notes } = req.body;

          if (
            pickupStateId !== undefined &&
            (typeof pickupStateId !== "string" || !pickupStateId)
          ) {
            errors.push("Pickup state ID must be a non-empty string.");
          }
          if (
            estimatePickupDate !== undefined &&
            !isValidDateTimeString(estimatePickupDate)
          ) {
            errors.push(
              "Estimate pickup date must be a valid date-time string."
            );
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          break;
        }
        case "search": {
          console.log("Validating order return search input...");
          const { limit, offset, userId } = req["sanitizedQuery"];

          if (limit !== undefined && !isValidNumString(limit)) {
            errors.push("Limit must be a valid number string.");
          }
          if (offset !== undefined && !isValidNumString(offset)) {
            errors.push("Offset must be a valid number string.");
          }
          if (userId !== undefined && (typeof userId !== "string" || !userId)) {
            errors.push("User ID must be a non-empty string.");
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
