import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidProductName,
  isValidColorHex,
  isValidListOfColorObj,
  isNoneArrObj,
  isEmptyObj,
  isValidNumString,
  isValidBooleanString,
} from "../../../../common/utils.common";
import {
  MODEL_VARIATION_SORT_OPTIONS,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
} from "../../../../common/configs.common";
import { HttpError } from "../../errorHandler";
import { isPresent, isValidImgUrls } from "../../utils";
import { isValidObjectId } from "mongoose";

function sanitizeVariationInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing model input...");
  const { name, color, band } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (isNoneArrObj(color) && !isEmptyObj(color)) {
    if (typeof color.name === "string") {
      req.body.color.name = removeOddSpaces(color.name);
    }
    if (typeof color.hex === "string") {
      req.body.color.hex = removeOddSpaces(color.hex);
    }
  }
  if (band) {
    const { material, colors, claspType, style } = band;

    if (typeof material === "string") {
      req.body.band.material = removeOddSpaces(material);
    }
    if (
      Array.isArray(colors) &&
      colors.every(
        (c: any) => typeof c.hex === "string" && typeof c.name === "string"
      )
    ) {
      req.body.band.colors = colors.map((c: any) => ({
        hex: removeOddSpaces(c.hex),
        name: removeOddSpaces(c.name),
      }));
    }
    if (typeof claspType === "string") {
      req.body.band.claspType = removeOddSpaces(claspType);
    }
    if (typeof style === "string") {
      req.body.band.style = removeOddSpaces(style);
    }
  }

  next();
}

function sanitizeVariationSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing model variation admin search input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm, stopSelling } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }
  if (typeof stopSelling === "string") {
    sanitizedQuery.stopSelling = removeOddSpaces(stopSelling.toLowerCase());
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeVariationDeleteBulkInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing model variation delete bulk input...");
  const { variationIds } = req.body;

  // Auto remove duplicates
  if (variationIds && Array.isArray(variationIds)) {
    req.body.variationIds = Array.from(new Set(variationIds));
  }

  next();
}

export function inputSanitizer(
  type: "variation" | "admin search" | "delete bulk"
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "variation":
      return sanitizeVariationInput;
    case "admin search":
      return sanitizeVariationSearchInput;
    case "delete bulk":
      return sanitizeVariationDeleteBulkInput;
  }
}

export function verifyVariationInput(
  type: "create" | "update" | "admin search" | "delete bulk"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating product variation model input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const {
            productModelId,
            name,
            color,
            imageUrls,
            additionalPriceCents,
            stockAdditionalPriceCents,
            band,
            stopSelling,
          } = req.body;

          if (!productModelId) {
            errors.push("productModelId is required.");
          } else if (!isValidObjectId(productModelId)) {
            errors.push("productModelId must be a valid ObjectId string.");
          }
          if (!name) {
            errors.push("name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (!color) {
            errors.push("color is required.");
          } else if (!isNoneArrObj(color)) {
            errors.push("color must be an object.");
          } else {
            const { hex, name } = color;
            if (!hex) {
              errors.push("color hex is required.");
            } else if (!isValidColorHex(hex)) {
              errors.push("color hex must be a valid color hex.");
            }
            if (!name) {
              errors.push("color name is required.");
            } else if (typeof name !== "string") {
              errors.push("color name must be a non-empty string.");
            }
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (
            isPresent(additionalPriceCents) &&
            (typeof additionalPriceCents !== "number" ||
              additionalPriceCents < 0)
          ) {
            errors.push("additional price must be a non-negative number.");
          }
          if (
            isPresent(stockAdditionalPriceCents) &&
            (typeof stockAdditionalPriceCents !== "number" ||
              stockAdditionalPriceCents < 0)
          ) {
            errors.push(
              "stock additional price must be a non-negative number."
            );
          }
          if (!band) {
            errors.push("band is required.");
          } else if (!isNoneArrObj(band)) {
            errors.push("band must be an object.");
          } else {
            const {
              widthMm,
              lugWidthMm,
              material,
              colors,
              claspType,
              adjustableRange,
              style,
              quickRelease,
              waterResistance,
              hypoallergenic,
              weightMg,
            } = band;

            if (widthMm === undefined) {
              errors.push("band width is required.");
            } else if (typeof widthMm !== "number" || widthMm <= 0) {
              errors.push("band width must be a positive number.");
            }
            if (lugWidthMm === undefined) {
              errors.push("band lug width is required.");
            } else if (typeof lugWidthMm !== "number" || lugWidthMm <= 0) {
              errors.push("band lug width must be a positive number.");
            }
            if (!material) {
              errors.push("band material is required.");
            } else if (typeof material !== "string") {
              errors.push("band material must be a non-empty string.");
            }
            if (!colors) {
              errors.push("band colors are required.");
            } else if (!isValidListOfColorObj(colors)) {
              errors.push("band colors must be a list of valid color objects.");
            }
            if (!claspType) {
              errors.push("band clasp type is required.");
            } else if (typeof claspType !== "string") {
              errors.push("band clasp type must be a non-empty string.");
            }
            if (!adjustableRange) {
              errors.push("band adjustable range is required.");
            } else if (!isNoneArrObj(adjustableRange)) {
              errors.push("band adjustable range must be an object.");
            } else {
              const { minMm, maxMm } = adjustableRange;
              let isValidRange = true;
              if (minMm === undefined) {
                errors.push("band adjustable range min is required.");
                isValidRange = false;
              } else if (typeof minMm !== "number" || minMm <= 0) {
                errors.push(
                  "band adjustable range min must be a positive number."
                );
                isValidRange = false;
              }
              if (maxMm === undefined) {
                errors.push("band adjustable range max is required.");
                isValidRange = false;
              } else if (typeof maxMm !== "number" || maxMm <= 0) {
                errors.push(
                  "band adjustable range max must be a positive number."
                );
                isValidRange = false;
              }
              if (isValidRange && minMm >= maxMm) {
                errors.push("band adjustable range min must be less than max.");
              }
            }
            if (!style) {
              errors.push("band style is required.");
            } else if (typeof style !== "string") {
              errors.push("band style must be a non-empty string.");
            }
            if (
              quickRelease !== undefined &&
              typeof quickRelease !== "boolean"
            ) {
              errors.push("band quick release must be a boolean.");
            }
            if (
              waterResistance !== undefined &&
              typeof waterResistance !== "boolean"
            ) {
              errors.push("band water resistance must be a boolean.");
            }
            if (
              hypoallergenic !== undefined &&
              typeof hypoallergenic !== "boolean"
            ) {
              errors.push("band hypoallergenic must be a boolean.");
            }
            if (weightMg === undefined) {
              errors.push("band weight is required.");
            } else if (typeof weightMg !== "number" || weightMg <= 0) {
              errors.push("band weight must be a positive number.");
            }
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          break;
        }
        case "update": {
          const {
            name,
            color,
            imageUrls,
            additionalPriceCents,
            stockAdditionalPriceCents,
            band,
            stopSelling,
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (color !== undefined) {
            if (!isNoneArrObj(color)) {
              errors.push("color must be an object.");
            } else if (!isEmptyObj(color)) {
              const { hex, name } = color;
              if (hex !== undefined && !isValidColorHex(hex)) {
                errors.push("color hex must be a valid color hex.");
              }
              if (name !== undefined && (typeof name !== "string" || !name)) {
                errors.push("color name must be a non-empty string.");
              }
            }
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (
            additionalPriceCents !== undefined &&
            (typeof additionalPriceCents !== "number" ||
              additionalPriceCents < 0)
          ) {
            errors.push("additional price must be a non-negative number.");
          }
          if (
            stockAdditionalPriceCents !== undefined &&
            (typeof stockAdditionalPriceCents !== "number" ||
              stockAdditionalPriceCents < 0)
          ) {
            errors.push(
              "stock additional price must be a non-negative number."
            );
          }
          if (band !== undefined) {
            if (!isNoneArrObj(band)) {
              errors.push("band must be an object.");
            } else if (!isEmptyObj(band)) {
              const {
                widthMm,
                lugWidthMm,
                material,
                colors,
                claspType,
                adjustableRange,
                style,
                quickRelease,
                waterResistance,
                hypoallergenic,
                weightMg,
              } = band;

              if (
                widthMm !== undefined &&
                (typeof widthMm !== "number" || widthMm <= 0)
              ) {
                errors.push("band width must be a positive number.");
              }
              if (
                lugWidthMm !== undefined &&
                (typeof lugWidthMm !== "number" || lugWidthMm <= 0)
              ) {
                errors.push("band lug width must be a positive number.");
              }
              if (
                material !== undefined &&
                (typeof material !== "string" || !material)
              ) {
                errors.push("band material must be a non-empty string.");
              }
              if (isPresent(colors) && !isValidListOfColorObj(colors)) {
                errors.push(
                  "band colors must be a list of valid color objects."
                );
              }
              if (
                claspType !== undefined &&
                (typeof claspType !== "string" || !claspType)
              ) {
                errors.push("band clasp type must be a non-empty string.");
              }
              if (adjustableRange !== undefined) {
                if (!isNoneArrObj(adjustableRange)) {
                  errors.push("band adjustable range must be an object.");
                } else if (!isEmptyObj(adjustableRange)) {
                  const { minMm, maxMm } = adjustableRange;
                  let isValidRange = true;

                  if (
                    minMm !== undefined &&
                    (typeof minMm !== "number" || minMm <= 0)
                  ) {
                    errors.push(
                      "band adjustable range min must be a positive number."
                    );
                    isValidRange = false;
                  }
                  if (
                    maxMm !== undefined &&
                    (typeof maxMm !== "number" || maxMm <= 0)
                  ) {
                    errors.push(
                      "band adjustable range max must be a positive number."
                    );
                    isValidRange = false;
                  }
                  // Only check if both are defined, for partial updates check will be handled in controllers
                  if (
                    isValidRange &&
                    minMm !== undefined &&
                    maxMm !== undefined &&
                    minMm >= maxMm
                  ) {
                    errors.push(
                      "band adjustable range min must be less than max."
                    );
                  }
                }
              }
              if (
                style !== undefined &&
                (typeof style !== "string" || !style)
              ) {
                errors.push("band style must be a non-empty string.");
              }
              if (
                quickRelease !== undefined &&
                typeof quickRelease !== "boolean"
              ) {
                errors.push("band quick release must be a boolean.");
              }
              if (
                waterResistance !== undefined &&
                typeof waterResistance !== "boolean"
              ) {
                errors.push("band water resistance must be a boolean.");
              }
              if (
                hypoallergenic !== undefined &&
                typeof hypoallergenic !== "boolean"
              ) {
                errors.push("band hypoallergenic must be a boolean.");
              }
              if (
                weightMg !== undefined &&
                (typeof weightMg !== "number" || weightMg <= 0)
              ) {
                errors.push("band weight must be a positive number.");
              }
            }
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          break;
        }
        case "admin search": {
          const {
            limit,
            offset,
            searchTerm,
            additionalPriceCentsMin,
            additionalPriceCentsMax,
            stockAdditionalPriceCentsMin,
            stockAdditionalPriceCentsMax,
            stopSelling,
            sortBy,
          } = req["sanitizedQuery"] || req.query;

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
          if (additionalPriceCentsMin !== undefined) {
            if (!isValidNumString(additionalPriceCentsMin)) {
              errors.push(
                "additionalPriceCentsMin must be a valid number string."
              );
            } else if (Number.parseInt(additionalPriceCentsMin, 10) < 0) {
              errors.push(
                "additionalPriceCentsMin must be a non-negative number."
              );
            }
          }
          if (additionalPriceCentsMax !== undefined) {
            if (!isValidNumString(additionalPriceCentsMax)) {
              errors.push(
                "additionalPriceCentsMax must be a valid number string."
              );
            } else if (Number.parseInt(additionalPriceCentsMax, 10) < 0) {
              errors.push(
                "additionalPriceCentsMax must be a non-negative number."
              );
            }
          }
          if (
            additionalPriceCentsMin !== undefined &&
            additionalPriceCentsMax !== undefined &&
            Number.parseInt(additionalPriceCentsMin, 10) >
              Number.parseInt(additionalPriceCentsMax, 10)
          ) {
            errors.push(
              "additionalPriceCentsMin cannot be greater than additionalPriceCentsMax."
            );
          }
          if (stockAdditionalPriceCentsMin !== undefined) {
            if (!isValidNumString(stockAdditionalPriceCentsMin)) {
              errors.push(
                "stockAdditionalPriceCentsMin must be a valid number string."
              );
            } else if (Number.parseInt(stockAdditionalPriceCentsMin, 10) < 0) {
              errors.push(
                "stockAdditionalPriceCentsMin must be a non-negative number."
              );
            }
          }
          if (stockAdditionalPriceCentsMax !== undefined) {
            if (!isValidNumString(stockAdditionalPriceCentsMax)) {
              errors.push(
                "stockAdditionalPriceCentsMax must be a valid number string."
              );
            } else if (Number.parseInt(stockAdditionalPriceCentsMax, 10) < 0) {
              errors.push(
                "stockAdditionalPriceCentsMax must be a non-negative number."
              );
            }
          }
          if (
            stockAdditionalPriceCentsMin !== undefined &&
            stockAdditionalPriceCentsMax !== undefined &&
            Number.parseInt(stockAdditionalPriceCentsMin, 10) >
              Number.parseInt(stockAdditionalPriceCentsMax, 10)
          ) {
            errors.push(
              "stockAdditionalPriceCentsMin cannot be greater than stockAdditionalPriceCentsMax."
            );
          }
          if (stopSelling !== undefined && !isValidBooleanString(stopSelling)) {
            errors.push("stopSelling must be a valid boolean string.");
          }
          if (
            sortBy !== undefined &&
            !MODEL_VARIATION_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${MODEL_VARIATION_SORT_OPTIONS.join(
                ", "
              )}.`
            );
          }
          break;
        }
        case "delete bulk": {
          const { variationIds } = req.body;

          if (!Array.isArray(variationIds) || variationIds.length === 0) {
            errors.push("variationIds must be a non-empty array.");
          } else {
            for (const [idx, id] of variationIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `variationIds[${idx}] is invalid. Each variationId must be a non-empty string.`
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
