import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errorHandler";
import {
  isStringArray,
  isValidBuyerReturnReason,
  isValidDateTimeString,
  isValidNumString,
  removeAllSpaces,
  removeOddSpaces,
} from "../../../common/utils.common";
import { isArrayOfNonEmptyStrings, isPresent, isValidImgUrls } from "../utils";
import { BUYER_RETURN_REASON_HINT_MESSAGE } from "../../../common/configs.common";

function sanitizeOrderInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing order input...");
  const {
    items, // { variationId: string, quantity: number }[]
    notes, // For updating order state
  } = req.body;

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

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

function sanitizeOrderSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing search order input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };

  const {
    searchTerm,
    deliveryStateId: deliveryStateIds,
    paymentStateId: paymentStateIds,
    stateId: stateIds,
  } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }

  if (Array.isArray(deliveryStateIds)) {
    sanitizedQuery.deliveryStateIds = [...new Set(deliveryStateIds)];
  } else {
    sanitizedQuery.deliveryStateIds = deliveryStateIds
      ? [deliveryStateIds]
      : [];
  }
  delete sanitizedQuery.deliveryStateId;

  if (Array.isArray(paymentStateIds)) {
    sanitizedQuery.paymentStateIds = [...new Set(paymentStateIds)];
  } else {
    sanitizedQuery.paymentStateIds = paymentStateIds ? [paymentStateIds] : [];
  }
  delete sanitizedQuery.paymentStateId;

  if (Array.isArray(stateIds)) {
    sanitizedQuery.stateIds = [...new Set(stateIds)];
  } else {
    sanitizedQuery.stateIds = stateIds ? [stateIds] : [];
  }
  delete sanitizedQuery.stateId;

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

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

function sanitizeOrderFulfillItemInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing order fulfill item input...");
  const { items } = req.body; // { variationId: string, instanceIds: string[] }[]

  // Auto accumulate instanceIds if they are in the same variation
  if (items && Array.isArray(items)) {
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
  type:
    | "order"
    | "order search"
    | "order return"
    | "fulfill order item"
    | "order return search"
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "order":
      return sanitizeOrderInput;
    case "order search":
      return sanitizeOrderSearchInput;
    case "order return":
      return sanitizeOrderReturnInput;
    case "fulfill order item":
      return sanitizeOrderFulfillItemInput;
    case "order return search":
      return sanitizeOrderReturnSearchInput;
  }
}

export function verifyOrderInput(
  type: "create" | "update" | "search" | "update fulfill item"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating order input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating order creation input...");
          const { userAddressId, items, paymentMethodId, applyUserBalance } =
            req.body;

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
          if (
            applyUserBalance !== undefined &&
            typeof applyUserBalance !== "boolean"
          ) {
            errors.push("Apply user balance must be a boolean value.");
          }

          break;
        }
        case "update": {
          console.log("Validating order update input...");
          const {
            deliveryStateId,
            deliveryAddressId,
            estimateReceivedDate,
            stateId,
            notes,
            buyerCancelReasonId,
          } = req.body;

          if (
            deliveryStateId !== undefined &&
            (typeof deliveryStateId !== "string" || !deliveryStateId)
          ) {
            errors.push("Delivery state ID must be a non-empty string.");
          }
          if (
            deliveryAddressId !== undefined &&
            (typeof deliveryAddressId !== "string" || !deliveryAddressId)
          ) {
            errors.push("Delivery address ID must be a non-empty string.");
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
            stateId !== undefined &&
            (typeof stateId !== "string" || !stateId)
          ) {
            errors.push("State ID must be a non-empty string.");
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          if (
            isPresent(buyerCancelReasonId) &&
            (typeof buyerCancelReasonId !== "string" || !buyerCancelReasonId)
          ) {
            errors.push("Buyer cancel reason ID must be a non-empty string.");
          }
          break;
        }
        case "search": {
          console.log("Validating order search input...");
          const {
            limit,
            offset,
            searchTerm,
            deliveryStateIds,
            paymentStateIds,
            stateIds,
            userId,
          } = req["sanitizedQuery"] || req.query; // Fallback to req.query just in case

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
            deliveryStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(deliveryStateIds)
          ) {
            errors.push(
              "Delivery state IDs must be an array of non-empty strings."
            );
          }
          if (
            paymentStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(paymentStateIds)
          ) {
            errors.push(
              "Payment state IDs must be an array of non-empty strings."
            );
          }
          if (stateIds !== undefined && !isArrayOfNonEmptyStrings(stateIds)) {
            errors.push("State IDs must be an array of non-empty strings.");
          }
          if (userId !== undefined && (typeof userId !== "string" || !userId)) {
            errors.push("User ID must be a non-empty string.");
          }

          break;
        }
        case "update fulfill item": {
          console.log("Validating order fulfill item update input...");
          const { items } = req.body; // { variationId: string, instanceIds: string[] }[]

          if (!items) {
            errors.push("Items are required.");
          } else if (!Array.isArray(items) || items.length === 0) {
            errors.push("Items must be a non-empty array.");
          } else {
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
              } else if (!isStringArray(item.instanceIds)) {
                errors.push(
                  `Item at index ${idx} instance IDs must be an array of strings.`
                );
              }
            });
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
