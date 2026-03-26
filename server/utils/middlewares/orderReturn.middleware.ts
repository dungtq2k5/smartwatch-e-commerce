import { Request, Response, NextFunction } from "express";
import {
  isStringArray,
  isValidBuyerReturnReason,
  isValidDateTimeString,
  isValidNumString,
  removeAllSpaces,
  removeOddSpaces,
} from "../../../common/utils.common";
import { isArrayOfNonEmptyStrings, isPresent, isValidImgUrls } from "../utils";
import {
  BUYER_RETURN_REASON_HINT_MESSAGE,
  ORDER_RETURN_SEARCH_SORT_OPTIONS,
} from "../../../common/configs.common";
import { HttpError } from "../errorHandler";

function sanitizeReturnInput(
  req: Request,
  res: Response,
  next: NextFunction,
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
          for (const id of item.instanceIds) {
            existingInstanceIds.add(id); // Because using Set -> no duplicate when adding
          }
          accumulatedItems.set(item.variationId, existingInstanceIds);
        }
      }

      // Convert the map back to an array of items
      const sanitizedItems = Array.from(
        accumulatedItems,
        ([variationId, idSet]) => ({
          variationId,
          instanceIds: Array.from(idSet),
        }),
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

function sanitizeReturnAdminSearchInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing search order return input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const {
    searchTerm,
    refundStateId: refundStateIds, // In url: refundStateId=1&refundStateId=2
    pickupStateId: pickupStateIds, // In url: pickupStateId=1&pickupStateId=2
    stateId: stateIds, // In url: stateId=1&stateId=2
    reasonId: reasonIds, // In url: reasonId=1&reasonId=2
  } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }

  if (Array.isArray(refundStateIds)) {
    sanitizedQuery.refundStateIds = [...new Set(refundStateIds)];
  } else {
    sanitizedQuery.refundStateIds = refundStateIds ? [refundStateIds] : [];
  }
  delete sanitizedQuery.refundStateId;

  if (Array.isArray(pickupStateIds)) {
    sanitizedQuery.pickupStateIds = [...new Set(pickupStateIds)];
  } else {
    sanitizedQuery.pickupStateIds = pickupStateIds ? [pickupStateIds] : [];
  }
  delete sanitizedQuery.pickupStateId;

  if (Array.isArray(stateIds)) {
    sanitizedQuery.stateIds = [...new Set(stateIds)];
  } else {
    sanitizedQuery.stateIds = stateIds ? [stateIds] : [];
  }
  delete sanitizedQuery.stateId;

  if (Array.isArray(reasonIds)) {
    sanitizedQuery.reasonIds = [...new Set(reasonIds)];
  } else {
    sanitizedQuery.reasonIds = reasonIds ? [reasonIds] : [];
  }
  delete sanitizedQuery.reasonId;

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeReturnStateUpdateBulkInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing order return state bulk update input...");
  const { returnIds, notes } = req.body;

  if (Array.isArray(returnIds)) {
    req.body.returnIds = [...new Set(returnIds)];
  }

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

function sanitizeReturnPickupStateUpdateInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing order return pickup state update input...");
  const { returnIds, notes } = req.body;

  if (Array.isArray(returnIds)) {
    req.body.returnIds = [...new Set(returnIds)];
  }

  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

export function inputSanitizer(
  type:
    | "return"
    | "return admin search"
    | "return state update bulk"
    | "return pickup state update bulk",
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "return":
      return sanitizeReturnInput;
    case "return admin search":
      return sanitizeReturnAdminSearchInput;
    case "return state update bulk":
      return sanitizeReturnStateUpdateBulkInput;
    case "return pickup state update bulk":
      return sanitizeReturnPickupStateUpdateInput;
  }
}

export function verifyReturnInput(
  type:
    | "create"
    | "update"
    | "update state"
    | "update pickup state"
    | "update state bulk"
    | "pickup state update bulk"
    | "search"
    | "admin search",
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    console.log("▶️ ", "Validating order return input...");

    const errors: string[] = [];
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
            !(await isValidImgUrls(imageUrls, "order-return"))
          ) {
            errors.push("Image URLs must be an array of valid image URLs.");
          }
          if (isPresent(buyerReason)) {
            if (typeof buyerReason !== "string" || !buyerReason) {
              errors.push("Buyer reason must be a non-empty string.");
            } else if (!isValidBuyerReturnReason(buyerReason)) {
              errors.push(
                `Buyer reason is invalid (${BUYER_RETURN_REASON_HINT_MESSAGE}).`,
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
              "Estimated pickup date must be a valid date-time string.",
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
              if (!item.instanceIds) {
                errors.push(`Item at index ${idx} is missing instance IDs.`);
              } else if (
                !Array.isArray(item.instanceIds) ||
                item.instanceIds.length === 0
              ) {
                errors.push(
                  `Item at index ${idx} instance IDs must be a non-empty array.`,
                );
              } else {
                for (const [idIdx, id] of item.instanceIds.entries()) {
                  if (typeof id !== "string" || !id) {
                    errors.push(
                      `Item at index ${idx} instance ID at index ${idIdx} must be a non-empty string.`,
                    );
                  }
                }
              }
            }
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
            !(await isValidImgUrls(imageUrls, "order-return"))
          ) {
            errors.push("Image URLs must be an array of valid image URLs.");
          }
          if (isPresent(buyerReason)) {
            if (typeof buyerReason !== "string" || !buyerReason) {
              errors.push("Buyer reason must be a non-empty string.");
            } else if (!isValidBuyerReturnReason(buyerReason)) {
              errors.push(
                `Buyer reason is invalid (${BUYER_RETURN_REASON_HINT_MESSAGE}).`,
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
              "Estimated pickup date must be a valid date-time string.",
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
              "Estimate pickup date must be a valid date-time string.",
            );
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          break;
        }
        case "update state bulk": {
          console.log("Validating order return state bulk update input...");
          const { returnIds, returnStateId, notes } = req.body;

          if (!returnIds) {
            errors.push("Return IDs are required.");
          } else if (!Array.isArray(returnIds) || returnIds.length === 0) {
            errors.push("Return IDs must be a non-empty array.");
          } else if (!isStringArray(returnIds)) {
            errors.push("Return IDs must be an array of strings.");
          }
          if (
            returnStateId !== undefined &&
            (typeof returnStateId !== "string" || !returnStateId)
          ) {
            errors.push("Return state ID must be a non-empty string.");
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          break;
        }
        case "pickup state update bulk": {
          console.log(
            "Validating order return pickup state bulk update input...",
          );
          const { returnIds, pickupStateId, estimatePickupDate, notes } =
            req.body;

          if (!returnIds) {
            errors.push("Return IDs are required.");
          } else if (!Array.isArray(returnIds) || returnIds.length === 0) {
            errors.push("Return IDs must be a non-empty array.");
          } else if (!isStringArray(returnIds)) {
            errors.push("Return IDs must be an array of strings.");
          }
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
              "Estimate pickup date must be a valid date-time string.",
            );
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("Notes must be a non-empty string.");
          }
          break;
        }
        case "search": {
          console.log("Validating order return search input...");
          const { limit, offset, orderId } = req.query; // No sanitize process for normal search

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
            orderId !== undefined &&
            (typeof orderId !== "string" || !orderId)
          ) {
            errors.push("Order ID must be a non-empty string.");
          }

          break;
        }
        case "admin search": {
          console.log("Validating order return search input...");
          const {
            limit,
            offset,
            searchTerm,
            sortBy,
            finalRefundAmountCentsMin,
            finalRefundAmountCentsMax,
            refundStateIds,
            pickupStateIds,
            stateIds,
            pickupDateFrom,
            pickupDateTo,
            estimatePickupDateFrom,
            estimatePickupDateTo,
            reasonIds,
            createdAtFrom,
            createdAtTo,
            updatedAtFrom,
            updatedAtTo,
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
            errors.push("Search term must be a non-empty string.");
          }
          if (
            sortBy !== undefined &&
            !ORDER_RETURN_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${ORDER_RETURN_SEARCH_SORT_OPTIONS.join(
                ", ",
              )}.`,
            );
          }

          if (finalRefundAmountCentsMin !== undefined) {
            if (!isValidNumString(finalRefundAmountCentsMin)) {
              errors.push(
                "finalRefundAmountCentsMin must be a valid number string.",
              );
            } else if (Number(finalRefundAmountCentsMin) < 0) {
              errors.push(
                "finalRefundAmountCentsMin must be greater than or equal to 0.",
              );
            }
          }
          if (finalRefundAmountCentsMax !== undefined) {
            if (!isValidNumString(finalRefundAmountCentsMax)) {
              errors.push(
                "finalRefundAmountCentsMax must be a valid number string.",
              );
            } else if (Number(finalRefundAmountCentsMax) < 0) {
              errors.push(
                "finalRefundAmountCentsMax must be greater than or equal to 0.",
              );
            }
          }
          if (
            finalRefundAmountCentsMin !== undefined &&
            finalRefundAmountCentsMax !== undefined &&
            Number(finalRefundAmountCentsMin) >
              Number(finalRefundAmountCentsMax)
          ) {
            errors.push(
              "finalRefundAmountCentsMin cannot be greater than finalRefundAmountCentsMax.",
            );
          }

          if (
            refundStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(refundStateIds)
          ) {
            errors.push(
              "refundStateIds must be an array of non-empty strings.",
            );
          }
          if (
            pickupStateIds !== undefined &&
            !isArrayOfNonEmptyStrings(pickupStateIds)
          ) {
            errors.push(
              "pickupStateIds must be an array of non-empty strings.",
            );
          }
          if (stateIds !== undefined && !isArrayOfNonEmptyStrings(stateIds)) {
            errors.push("stateIds must be an array of non-empty strings.");
          }
          if (reasonIds !== undefined && !isArrayOfNonEmptyStrings(reasonIds)) {
            errors.push("reasonIds must be an array of non-empty strings.");
          }
          if (
            pickupDateFrom !== undefined &&
            !isValidDateTimeString(pickupDateFrom)
          ) {
            errors.push("pickupDateFrom must be a valid date-time string.");
          }

          if (
            pickupDateTo !== undefined &&
            !isValidDateTimeString(pickupDateTo)
          ) {
            errors.push("pickupDateTo must be a valid date-time string.");
          }
          if (
            pickupDateFrom !== undefined &&
            pickupDateTo !== undefined &&
            new Date(pickupDateFrom) > new Date(pickupDateTo)
          ) {
            errors.push("pickupDateFrom cannot be later than pickupDateTo.");
          }

          if (
            estimatePickupDateFrom !== undefined &&
            !isValidDateTimeString(estimatePickupDateFrom)
          ) {
            errors.push(
              "estimatePickupDateFrom must be a valid date-time string.",
            );
          }
          if (
            estimatePickupDateTo !== undefined &&
            !isValidDateTimeString(estimatePickupDateTo)
          ) {
            errors.push(
              "estimatePickupDateTo must be a valid date-time string.",
            );
          }
          if (
            estimatePickupDateFrom !== undefined &&
            estimatePickupDateTo !== undefined &&
            new Date(estimatePickupDateFrom) > new Date(estimatePickupDateTo)
          ) {
            errors.push(
              "estimatePickupDateFrom cannot be later than estimatePickupDateTo.",
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
            errors.push("createdAtFrom cannot be later than createdAtTo.");
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
            errors.push("updatedAtFrom cannot be later than updatedAtTo.");
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
