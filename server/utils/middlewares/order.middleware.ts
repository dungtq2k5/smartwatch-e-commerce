import { Request, Response, NextFunction } from "express";
import { HttpError } from "../errorHandler";
import {
  isStringArray,
  isValidBooleanString,
  isValidDateTimeString,
  isValidNumString,
  removeAllSpaces,
  removeOddSpaces,
} from "../../../common/utils.common";
import { isArrayOfNonEmptyStrings, isPresent } from "../utils";
import { ORDER_SEARCH_SORT_OPTIONS } from "../../../common/configs.common";

function sanitizeOrderInput(
  req: Request,
  res: Response,
  next: NextFunction,
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
          existingQuantity + item.quantity,
        );
      }
    }

    // Convert the map back to an array of items
    const sanitizedItems = Array.from(
      accumulatedItems,
      ([variationId, quantity]) => ({
        variationId,
        quantity,
      }),
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
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing search order input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };

  const {
    searchTerm,
    deliveryStateId: deliveryStateIds, // In url: deliveryStateId=1&deliveryStateId=2
    paymentStateId: paymentStateIds, // In url: paymentStateId=1&paymentStateId=2
    paymentMethodId: paymentMethodIds, // In url: paymentMethodId=1&paymentMethodId=2
    stateId: stateIds,
    canReturn,
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

  if (Array.isArray(paymentMethodIds)) {
    sanitizedQuery.paymentMethodIds = [...new Set(paymentMethodIds)];
  } else {
    sanitizedQuery.paymentMethodIds = paymentMethodIds
      ? [paymentMethodIds]
      : [];
  }
  delete sanitizedQuery.paymentMethodId;

  if (Array.isArray(stateIds)) {
    sanitizedQuery.stateIds = [...new Set(stateIds)];
  } else {
    sanitizedQuery.stateIds = stateIds ? [stateIds] : [];
  }
  delete sanitizedQuery.stateId;

  if (typeof canReturn === "string") {
    sanitizedQuery.canReturn = removeAllSpaces(canReturn.toLocaleLowerCase());
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeOrderFulfillItemInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing order fulfill item input...");
  const { items } = req.body; // { variationId: string, skus: string[] }[]

  // Auto accumulate skus if they are in the same variation
  if (items && Array.isArray(items)) {
    const accumulatedItems = new Map<string, Set<string>>();
    for (const item of items) {
      // Ensure the item has the required properties before processing
      if (item?.variationId && Array.isArray(item.skus)) {
        const existingSkus =
          accumulatedItems.get(item.variationId) || new Set<string>();
        for (const id of item.skus) {
          existingSkus.add(id);
        } // Because using Set -> no duplicate when adding
        accumulatedItems.set(item.variationId, existingSkus);
      }
    }

    // Convert the map back to an array of items
    const sanitizedItems = Array.from(
      accumulatedItems,
      ([variationId, skuSet]) => ({
        variationId,
        skus: Array.from(skuSet),
      }),
    );
    req.body.items = sanitizedItems;
  }

  next();
}

function sanitizeOrderUpdateBulkInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing order update bulk input...");
  const { orderIds, notes } = req.body;

  if (Array.isArray(orderIds)) {
    req.body.orderIds = [...new Set(orderIds)];
  }

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

export function inputSanitizer(
  type:
    | "order"
    | "order search"
    | "order admin search"
    | "fulfill order item"
    | "order update bulk",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "order":
      return sanitizeOrderInput;
    case "order search":
    case "order admin search":
      return sanitizeOrderSearchInput;
    case "fulfill order item":
      return sanitizeOrderFulfillItemInput;
    case "order update bulk":
      return sanitizeOrderUpdateBulkInput;
  }
}

export function verifyOrderInput(
  type:
    | "create"
    | "update"
    | "search"
    | "admin search"
    | "update fulfill item"
    | "update bulk",
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating order input...");

    const errors: string[] = [];
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
            for (const [idx, item] of items.entries()) {
              if (!item.variationId) {
                errors.push(`Item at index ${idx} is missing variation ID.`);
              } else if (
                typeof item.variationId !== "string" ||
                !item.variationId
              ) {
                errors.push(
                  `Item at index ${idx} variation ID must be a non-empty string.`,
                );
              }
              if (!item.quantity) {
                errors.push(`Item at index ${idx} is missing quantity.`);
              } else if (
                typeof item.quantity !== "number" ||
                item.quantity <= 0
              ) {
                errors.push(
                  `Item at index ${idx} quantity must be a positive number.`,
                );
              }
            }
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
              "Estimate received date must be a valid date-time string.",
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
          } = req["sanitizedQuery"] || req.query; // Fallback to req.query just in case

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
            errors.push("Search term must be a non-empty string.");
          }
          if (
            deliveryStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(deliveryStateIds)
          ) {
            errors.push(
              "Delivery state IDs must be an array of non-empty strings.",
            );
          }
          if (
            paymentStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(paymentStateIds)
          ) {
            errors.push(
              "Payment state IDs must be an array of non-empty strings.",
            );
          }
          if (stateIds !== undefined && !isArrayOfNonEmptyStrings(stateIds)) {
            errors.push("State IDs must be an array of non-empty strings.");
          }

          break;
        }
        case "admin search": {
          console.log("Validating order search input...");
          const {
            limit,
            offset,
            searchTerm,
            sortBy,
            deliveryStateIds,
            paymentStateIds,
            paymentMethodIds,
            stateIds,
            orderedBy,
            canReturn,
            orderAtFrom,
            orderAtTo,
            estimateReceivedDateFrom,
            estimateReceivedDateTo,
            receivedDateFrom,
            receivedDateTo,
            createdAtFrom,
            createdAtTo,
            updatedAtFrom,
            updatedAtTo,
          } = req["sanitizedQuery"] || req.query; // Fallback to req.query just in case

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
            errors.push("Search term must be a non-empty string.");
          }
          if (
            sortBy !== undefined &&
            !ORDER_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${ORDER_SEARCH_SORT_OPTIONS.join(
                ", ",
              )}.`,
            );
          }
          if (
            deliveryStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(deliveryStateIds)
          ) {
            errors.push(
              "Delivery state IDs must be an array of non-empty strings.",
            );
          }
          if (
            paymentStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(paymentStateIds)
          ) {
            errors.push(
              "Payment state IDs must be an array of non-empty strings.",
            );
          }
          if (
            paymentMethodIds !== undefined &&
            !isArrayOfNonEmptyStrings(paymentMethodIds)
          ) {
            errors.push(
              "Payment method IDs must be an array of non-empty strings.",
            );
          }
          if (stateIds !== undefined && !isArrayOfNonEmptyStrings(stateIds)) {
            errors.push("State IDs must be an array of non-empty strings.");
          }
          if (
            orderedBy !== undefined &&
            (typeof orderedBy !== "string" || !orderedBy)
          ) {
            errors.push("orderedBy must be a non-empty string.");
          }
          if (canReturn !== undefined && isValidBooleanString(canReturn)) {
            errors.push("canReturn must be a boolean string (true or false).");
          }
          if (
            orderAtFrom !== undefined &&
            !isValidDateTimeString(orderAtFrom)
          ) {
            errors.push("orderAtFrom must be a valid date-time string.");
          }
          if (orderAtTo !== undefined && !isValidDateTimeString(orderAtTo)) {
            errors.push("orderAtTo must be a valid date-time string.");
          }
          if (
            orderAtFrom !== undefined &&
            orderAtTo !== undefined &&
            new Date(orderAtFrom) > new Date(orderAtTo)
          ) {
            errors.push("orderAtFrom must be less than or equal to orderAtTo.");
          }
          if (
            estimateReceivedDateFrom !== undefined &&
            !isValidDateTimeString(estimateReceivedDateFrom)
          ) {
            errors.push(
              "estimateReceivedDateFrom must be a valid date-time string.",
            );
          }
          if (
            estimateReceivedDateTo !== undefined &&
            !isValidDateTimeString(estimateReceivedDateTo)
          ) {
            errors.push(
              "estimateReceivedDateTo must be a valid date-time string.",
            );
          }
          if (
            estimateReceivedDateFrom !== undefined &&
            estimateReceivedDateTo !== undefined &&
            new Date(estimateReceivedDateFrom) >
              new Date(estimateReceivedDateTo)
          ) {
            errors.push(
              "estimateReceivedDateFrom must be less than or equal to estimateReceivedDateTo.",
            );
          }
          if (
            receivedDateFrom !== undefined &&
            !isValidDateTimeString(receivedDateFrom)
          ) {
            errors.push("receivedDateFrom must be a valid date-time string.");
          }
          if (
            receivedDateTo !== undefined &&
            !isValidDateTimeString(receivedDateTo)
          ) {
            errors.push("receivedDateTo must be a valid date-time string.");
          }
          if (
            receivedDateFrom !== undefined &&
            receivedDateTo !== undefined &&
            new Date(receivedDateFrom) > new Date(receivedDateTo)
          ) {
            errors.push(
              "receivedDateFrom must be less than or equal to receivedDateTo.",
            );
          }
          if (
            createdAtFrom !== undefined &&
            !isValidDateTimeString(createdAtFrom)
          ) {
            errors.push("createdAtFrom must be a valid date-time string.");
          }
          if (
            createdAtTo !== undefined &&
            !isValidDateTimeString(createdAtTo)
          ) {
            errors.push("createdAtTo must be a valid date-time string.");
          }
          if (
            createdAtFrom !== undefined &&
            createdAtTo !== undefined &&
            new Date(createdAtFrom) > new Date(createdAtTo)
          ) {
            errors.push(
              "createdAtFrom must be less than or equal to createdAtTo.",
            );
          }
          if (
            updatedAtFrom !== undefined &&
            !isValidDateTimeString(updatedAtFrom)
          ) {
            errors.push("updatedAtFrom must be a valid date-time string.");
          }
          if (
            updatedAtTo !== undefined &&
            !isValidDateTimeString(updatedAtTo)
          ) {
            errors.push("updatedAtTo must be a valid date-time string.");
          }
          if (
            updatedAtFrom !== undefined &&
            updatedAtTo !== undefined &&
            new Date(updatedAtFrom) > new Date(updatedAtTo)
          ) {
            errors.push(
              "updatedAtFrom must be less than or equal to updatedAtTo.",
            );
          }
          break;
        }
        case "update fulfill item": {
          console.log("Validating order fulfill item update input...");
          const { items } = req.body; // { variationId: string, skus: string[] }[]

          if (!items) {
            errors.push("Items are required.");
          } else if (!Array.isArray(items) || items.length === 0) {
            errors.push("Items must be a non-empty array.");
          } else {
            for (const [idx, item] of items.entries()) {
              if (!item.variationId) {
                errors.push(`Item at index ${idx} is missing variation ID.`);
              } else if (
                typeof item.variationId !== "string" ||
                !item.variationId
              ) {
                errors.push(
                  `Item at index ${idx} variation ID must be a non-empty string.`,
                );
              }
              if (!item.skus) {
                errors.push(`Item at index ${idx} is missing SKUs.`);
              } else if (
                !Array.isArray(item.skus) ||
                item.skus.length === 0
              ) {
                errors.push(
                  `Item at index ${idx} SKUs must be a non-empty array.`,
                );
              } else if (!isStringArray(item.skus)) {
                errors.push(
                  `Item at index ${idx} SKUs must be an array of strings.`,
                );
              }
            }
          }
          break;
        }
        case "update bulk": {
          console.log("Validating order update bulk input...");
          const { orderIds, deliveryStateId, notes, estimateReceivedDate } =
            req.body;

          if (!orderIds) {
            errors.push("Order IDs are required.");
          } else if (!Array.isArray(orderIds) || orderIds.length === 0) {
            errors.push("Order IDs must be a non-empty array.");
          } else if (!isStringArray(orderIds)) {
            errors.push("Order IDs must be an array of strings.");
          }
          if (
            deliveryStateId !== undefined &&
            (typeof deliveryStateId !== "string" || !deliveryStateId)
          ) {
            errors.push("Delivery state ID must be a non-empty string.");
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          if (
            estimateReceivedDate !== undefined &&
            !isValidDateTimeString(estimateReceivedDate)
          ) {
            errors.push(
              "Estimate received date must be a valid date-time string.",
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

export function verifyPaymentIntentInput(
  type: "create",
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating payment intent input...");

    const errors: string[] = [];
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
