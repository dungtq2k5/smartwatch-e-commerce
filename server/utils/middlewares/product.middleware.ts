import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidProductName,
  isValidDateTimeString,
  isValidColorHex,
  isValidNumString,
  removeAllSpaces,
  isValidListOfColorObj,
  isNoneArrObj,
  isEmptyObj,
} from "../../../common/utils.common";
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_SEARCH_SORT_OPTIONS,
  PRODUCT_TYPES,
} from "../../../common/configs.common";
import { HttpError } from "../errorHandler";
import {
  isArrayOfNonEmptyStrings,
  isPresent,
  isValidImgUrls,
} from "../../utils/utils";

function sanitizeProductInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product input...");
  const { name, type, description } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof type === "string") {
    req.body.type = removeOddSpaces(type).toLowerCase();
  }
  if (typeof description === "string") {
    req.body.description = removeOddSpaces(description);
  }

  next();
}

function sanitizeModelVariationInput(
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

function sanitizeProductSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product search input...");

  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm, type, stopSelling } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }
  if (typeof type === "string") {
    sanitizedQuery.type = removeOddSpaces(type).toLowerCase();
  }
  if (typeof stopSelling === "string") {
    sanitizedQuery.stopSelling = removeAllSpaces(stopSelling.toLowerCase());
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

const sanitizeBrandInput = sanitizeProductInput;
const sanitizeCategoryInput = sanitizeProductInput;
const sanitizeOsInput = sanitizeProductInput;

function sanitizeProductModelInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product model input...");
  const { name, feature, config, battery, screen, caseMaterial } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof caseMaterial === "string") {
    req.body.caseMaterial = removeOddSpaces(caseMaterial);
  }
  if (isNoneArrObj(feature) && !isEmptyObj(feature)) {
    const {
      waterResistance, // rating, description
      utilities, // list of healths, sports, specials, others
      supportedAppsForNotifications,
    } = feature;

    if (isNoneArrObj(waterResistance) && !isEmptyObj(waterResistance)) {
      if (typeof waterResistance.rating === "string") {
        req.body.feature.waterResistance.rating = removeOddSpaces(
          waterResistance.rating
        );
      }
      if (typeof waterResistance.description === "string") {
        req.body.feature.waterResistance.description = removeOddSpaces(
          waterResistance.description
        );
      }
    }
    if (isNoneArrObj(utilities) && !isEmptyObj(utilities)) {
      if (isArrayOfNonEmptyStrings(utilities.healths)) {
        req.body.feature.utilities.healths = utilities.healths.map(
          (item: string) => removeOddSpaces(item)
        );
      }
      if (isArrayOfNonEmptyStrings(utilities.sports)) {
        req.body.feature.utilities.sports = utilities.sports.map(
          (item: string) => removeOddSpaces(item)
        );
      }
      if (isArrayOfNonEmptyStrings(utilities.specials)) {
        req.body.feature.utilities.specials = utilities.specials.map(
          (item: string) => removeOddSpaces(item)
        );
      }
      if (isArrayOfNonEmptyStrings(utilities.others)) {
        req.body.feature.utilities.others = utilities.others.map(
          (item: string) => removeOddSpaces(item)
        );
      }
    }
    if (isArrayOfNonEmptyStrings(supportedAppsForNotifications)) {
      req.body.feature.supportedAppsForNotifications =
        supportedAppsForNotifications.map((item: string) =>
          removeOddSpaces(item)
        );
    }
  }
  if (isNoneArrObj(config) && !isEmptyObj(config)) {
    const {
      connectivities,
      camera,
      chipset,
      compatiblePhoneOs,
      appsConnect,
      sensors,
    } = config;

    if (isArrayOfNonEmptyStrings(connectivities)) {
      req.body.config.connectivities = connectivities.map((item: string) =>
        removeOddSpaces(item)
      );
    }
    if (
      isNoneArrObj(camera) &&
      !isEmptyObj(camera) &&
      isArrayOfNonEmptyStrings(camera.features)
    ) {
      req.body.config.camera.features = camera.features.map((item: string) =>
        removeOddSpaces(item)
      );
    }
    if (typeof chipset === "string") {
      req.body.config.chipset = removeOddSpaces(chipset);
    }
    if (isArrayOfNonEmptyStrings(compatiblePhoneOs)) {
      req.body.config.compatiblePhoneOs = compatiblePhoneOs.map(
        (item: string) => removeOddSpaces(item)
      );
    }
    if (isArrayOfNonEmptyStrings(appsConnect)) {
      req.body.config.appsConnect = appsConnect.map((item: string) =>
        removeOddSpaces(item)
      );
    }
    if (isArrayOfNonEmptyStrings(sensors)) {
      req.body.config.sensors = sensors.map((item: string) =>
        removeOddSpaces(item)
      );
    }
  }
  if (isNoneArrObj(battery) && !isEmptyObj(battery)) {
    const { chargingType } = battery;
    if (typeof chargingType === "string") {
      req.body.battery.chargingType = removeOddSpaces(chargingType);
    }
  }
  if (isNoneArrObj(screen) && !isEmptyObj(screen)) {
    const { display, glassMaterial, bezelMaterial, shape } = screen;

    if (
      isNoneArrObj(display) &&
      !isEmptyObj(display) &&
      typeof display.displayType === "string"
    ) {
      req.body.screen.display.displayType = removeOddSpaces(
        display.displayType
      );
    }
    if (typeof glassMaterial === "string") {
      req.body.screen.glassMaterial = removeOddSpaces(glassMaterial);
    }
    if (typeof bezelMaterial === "string") {
      req.body.screen.bezelMaterial = removeOddSpaces(bezelMaterial);
    }
    if (typeof shape === "string") {
      req.body.screen.shape = removeOddSpaces(shape);
    }
  }

  next();
}

function sanitizeProductDetailQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product detail query input...");

  const sanitizedQuery = { ...req.query };
  const { modelStopSelling, variationStopSelling } = sanitizedQuery;

  if (typeof modelStopSelling === "string") {
    sanitizedQuery.modelStopSelling = removeAllSpaces(
      modelStopSelling.toLowerCase()
    );
  }
  if (typeof variationStopSelling === "string") {
    sanitizedQuery.variationStopSelling = removeAllSpaces(
      variationStopSelling.toLowerCase()
    );
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

export function inputSanitizer(
  type:
    | "product"
    | "brand"
    | "category"
    | "os"
    | "model"
    | "variation"
    | "product search"
    | "product details"
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "product":
      return sanitizeProductInput;
    case "brand":
      return sanitizeBrandInput;
    case "category":
      return sanitizeCategoryInput;
    case "os":
      return sanitizeOsInput;
    case "model":
      return sanitizeProductModelInput;
    case "variation":
      return sanitizeModelVariationInput;
    case "product search":
      return sanitizeProductSearchInput;
    case "product details":
      return sanitizeProductDetailQuery;
  }
}

export function verifyProductInput(
  type: "create" | "update" | "search" | "details"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating product input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          console.log("Validating product creation input...");
          const {
            name,
            type,
            brandId,
            categoryId,
            imageUrls,
            description,
            stopSelling,
            basePriceCents,
          } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (!type) {
            errors.push("type is required.");
          } else if (!PRODUCT_TYPES.includes(type)) {
            errors.push(
              `type must be one of the following: ${PRODUCT_TYPES.join(", ")}`
            );
          }
          if (!brandId) {
            errors.push("ID is required.");
          }
          if (!categoryId) {
            errors.push("ID is required.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (typeof description !== "string" || !description) {
            errors.push("description is required.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          if (basePriceCents === undefined) {
            errors.push("base price is required.");
          } else if (typeof basePriceCents !== "number" || basePriceCents < 0) {
            errors.push("base price must be a non-negative number.");
          }
          break;
        }
        case "update": {
          console.log("Validating product update input...");
          const {
            name,
            type,
            brandId,
            categoryId,
            imageUrls,
            description,
            stopSelling,
            basePriceCents,
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (type !== undefined && !PRODUCT_TYPES.includes(type)) {
            errors.push(
              `type must be one of the following: ${PRODUCT_TYPES.join(", ")}`
            );
          }
          if (
            brandId !== undefined &&
            (typeof brandId !== "string" || !brandId)
          ) {
            errors.push("ID must be a non-empty string.");
          }
          if (
            categoryId !== undefined &&
            (typeof categoryId !== "string" || !categoryId)
          ) {
            errors.push("ID must be a non-empty string.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (
            description !== undefined &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          if (
            basePriceCents !== undefined &&
            (typeof basePriceCents !== "number" || basePriceCents < 0)
          ) {
            errors.push("base price must be a non-negative number.");
          }
          break;
        }
        case "search": {
          console.log("Validating product search input...");
          const {
            limit,
            offset,
            searchTerm,
            type,
            brandId,
            categoryId,
            stopSelling,
            priceCentsMin,
            priceCentsMax,
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
            errors.push("search term must be a non-empty string.");
          }
          if (type !== undefined && !PRODUCT_TYPES.includes(type as any)) {
            errors.push(
              `type must be one of the following: ${PRODUCT_TYPES.join(", ")}`
            );
          }
          if (
            brandId !== undefined &&
            (typeof brandId !== "string" || !brandId)
          ) {
            errors.push("ID must be a non-empty string.");
          }
          if (
            categoryId !== undefined &&
            (typeof categoryId !== "string" || !categoryId)
          ) {
            errors.push("ID must be a non-empty string.");
          }
          if (
            stopSelling !== undefined &&
            !["true", "false"].includes(stopSelling as any)
          ) {
            errors.push("stopSelling must be a boolean string.");
          }
          if (priceCentsMin !== undefined) {
            if (!isValidNumString(priceCentsMin)) {
              errors.push("priceCentsMin must be a valid number string.");
            } else if (parseInt(priceCentsMin as string, 10) < 0) {
              errors.push("priceCentsMin must be a non-negative number.");
            }
          }
          if (priceCentsMax !== undefined) {
            if (!isValidNumString(priceCentsMax)) {
              errors.push("priceCentsMax must be a valid number string.");
            } else if (parseInt(priceCentsMax as string, 10) < 0) {
              errors.push("priceCentsMax must be a non-negative number.");
            }
          }
          if (
            priceCentsMin !== undefined &&
            priceCentsMax !== undefined &&
            parseInt(priceCentsMin as string, 10) >
              parseInt(priceCentsMax as string, 10)
          ) {
            errors.push("priceCentsMin cannot be greater than priceCentsMax.");
          }
          if (
            sortBy !== undefined &&
            !PRODUCT_SEARCH_SORT_OPTIONS.includes(sortBy as any)
          ) {
            errors.push(
              `sortBy must be one of the following: ${PRODUCT_SEARCH_SORT_OPTIONS.join(
                ", "
              )}`
            );
          }
          break;
        }
        case "details": {
          console.log("Validating product details input...");
          const { modelStopSelling, variationStopSelling } =
            req["sanitizedQuery"] || req.query;

          if (
            modelStopSelling !== undefined &&
            !["true", "false"].includes(modelStopSelling as any)
          ) {
            errors.push("modelStopSelling must be a boolean string.");
          }
          if (
            variationStopSelling !== undefined &&
            !["true", "false"].includes(variationStopSelling as any)
          ) {
            errors.push("variationStopSelling must be a boolean string.");
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

export function verifyBrandInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating product brand input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name, logoUrl, description } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (typeof name !== "string") {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(logoUrl) &&
            !(await isValidImgUrls(logoUrl, "product"))
          ) {
            errors.push("logo URL must be a valid image URL.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name, logoUrl, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(logoUrl) &&
            !(await isValidImgUrls(logoUrl, "product"))
          ) {
            errors.push("logo URL must be a valid image URL or null.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string or null.");
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

export function verifyCategoryInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating product category input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name, description } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (typeof name !== "string") {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string or null.");
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

export function verifyOsInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating product OS input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name, logoUrl, description } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (typeof name !== "string") {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(logoUrl) &&
            !(await isValidImgUrls(logoUrl, "product"))
          ) {
            errors.push("logo URL must be a valid image URL.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name, logoUrl, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a non-empty string.");
          }
          if (
            isPresent(logoUrl) &&
            !(await isValidImgUrls(logoUrl, "product"))
          ) {
            errors.push("logo URL must be a valid image URL.");
          }
          if (
            isPresent(description) &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("description must be a non-empty string or null.");
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

export function verifyProductModelInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating product model input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const {
            name,
            priceCents,
            stockPriceCents,
            imageUrls,
            feature,
            config,
            battery,
            screen,
            caseMaterial,
            watchWeightMg,
            compatibleBandLugWidthMm,
            releaseDate,
            stopSelling,
          } = req.body;

          if (!name) {
            errors.push("name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (priceCents === undefined) {
            errors.push("price is required.");
          } else if (typeof priceCents !== "number" || priceCents < 0) {
            errors.push("price must be a non-negative number.");
          }
          if (stockPriceCents === undefined) {
            errors.push("stock price is required.");
          } else if (
            typeof stockPriceCents !== "number" ||
            stockPriceCents < 0
          ) {
            errors.push("stock price must be a non-negative number.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (!feature) {
            errors.push("feature is required.");
          } else if (!isNoneArrObj(feature)) {
            errors.push("feature must be an object.");
          } else {
            const {
              speakerAndMicrophone,
              waterResistance,
              utilities,
              supportedAppsForNotifications,
            } = feature;

            if (
              speakerAndMicrophone !== undefined &&
              typeof speakerAndMicrophone !== "boolean"
            ) {
              errors.push("speakerAndMicrophone must be a boolean.");
            }
            if (isPresent(waterResistance)) {
              if (!isNoneArrObj(waterResistance)) {
                errors.push("waterResistance must be an object.");
              } else {
                // If an obj must have rating
                const { rating, description } = waterResistance;

                if (!rating) {
                  errors.push("waterResistance rating is required.");
                } else if (typeof rating !== "string") {
                  errors.push(
                    "waterResistance rating must be a non-empty string."
                  );
                }
                if (
                  isPresent(description) &&
                  (typeof description !== "string" || !description)
                ) {
                  errors.push(
                    "waterResistance description must be a non-empty string."
                  );
                }
              }
            }
            if (isPresent(utilities)) {
              if (!isNoneArrObj(utilities)) {
                errors.push("utilities must be an object.");
              } else if (!isEmptyObj(utilities)) {
                const { healths, sports, specials, others } = utilities;

                if (isPresent(healths) && !isArrayOfNonEmptyStrings(healths)) {
                  errors.push(
                    "utilities healths must be an array of non-empty strings."
                  );
                }
                if (isPresent(sports) && !isArrayOfNonEmptyStrings(sports)) {
                  errors.push(
                    "utilities sports must be an array of non-empty strings."
                  );
                }
                if (
                  isPresent(specials) &&
                  !isArrayOfNonEmptyStrings(specials)
                ) {
                  errors.push(
                    "utilities specials must be an array of non-empty strings."
                  );
                }
                if (isPresent(others) && !isArrayOfNonEmptyStrings(others)) {
                  errors.push(
                    "utilities others must be an array of non-empty strings."
                  );
                }
              }
            }
            if (
              isPresent(supportedAppsForNotifications) &&
              !isArrayOfNonEmptyStrings(supportedAppsForNotifications)
            ) {
              errors.push(
                "supportedAppsForNotifications must be an array of non-empty strings."
              );
            }
          }
          if (!config) {
            errors.push("config is required.");
          } else if (!isNoneArrObj(config)) {
            errors.push("config must be an object.");
          } else {
            const {
              connectivities,
              camera,
              chipset,
              memory,
              osId,
              compatiblePhoneOs,
              appsConnect,
              sensors,
            } = config;

            if (
              isPresent(connectivities) &&
              !isArrayOfNonEmptyStrings(connectivities)
            ) {
              errors.push(
                "connectivities must be an array of non-empty strings."
              );
            }
            if (isPresent(camera)) {
              if (!isNoneArrObj(camera)) {
                errors.push("camera must be an object.");
              } else {
                const { resolutionMp, features } = camera;
                if (resolutionMp === undefined) {
                  errors.push("camera resolution is required.");
                } else if (
                  typeof resolutionMp !== "number" ||
                  resolutionMp < 0
                ) {
                  errors.push(
                    "camera resolution must be a non-negative number."
                  );
                }
                if (
                  isPresent(features) &&
                  !isArrayOfNonEmptyStrings(features)
                ) {
                  errors.push(
                    "camera features must be an array of non-empty strings."
                  );
                }
              }
            }
            if (!chipset) {
              errors.push("chipset is required.");
            } else if (typeof chipset !== "string") {
              errors.push("chipset must be a non-empty string.");
            }
            if (!memory) {
              errors.push("memory is required.");
            } else if (!isNoneArrObj(memory)) {
              errors.push("memory must be an object.");
            } else {
              const { ramBytes, storageBytes } = memory;
              if (ramBytes === undefined) {
                errors.push("memory RAM is required.");
              } else if (typeof ramBytes !== "number" || ramBytes < 0) {
                errors.push("memory RAM must be a non-negative number.");
              }
              if (storageBytes === undefined) {
                errors.push("memory storage is required.");
              } else if (typeof storageBytes !== "number" || storageBytes < 0) {
                errors.push("memory storage must be a non-negative number.");
              }
            }
            if (!osId) {
              errors.push("OS ID is required.");
            } else if (typeof osId !== "string") {
              errors.push("OS ID must be a non-empty string.");
            }
            if (
              isPresent(compatiblePhoneOs) &&
              !isArrayOfNonEmptyStrings(compatiblePhoneOs)
            ) {
              errors.push(
                "compatiblePhoneOs must be an array of non-empty strings."
              );
            }
            if (
              isPresent(appsConnect) &&
              !isArrayOfNonEmptyStrings(appsConnect)
            ) {
              errors.push("appsConnect must be an array of non-empty strings.");
            }
            if (isPresent(sensors) && !isArrayOfNonEmptyStrings(sensors)) {
              errors.push("sensors must be an array of non-empty strings.");
            }
          }
          if (!battery) {
            errors.push("battery is required.");
          } else if (!isNoneArrObj(battery)) {
            errors.push("battery must be an object.");
          } else {
            const { capacityMah, timeOnline, timeFullChargeMin, chargingType } =
              battery;
            if (capacityMah === undefined) {
              errors.push("battery capacity is required.");
            } else if (typeof capacityMah !== "number" || capacityMah <= 0) {
              errors.push("battery capacity must be a positive number.");
            }
            if (!timeOnline) {
              errors.push("battery time online is required.");
            } else if (!isNoneArrObj(timeOnline)) {
              errors.push("battery time online must be an object.");
            } else {
              const { aodOnMin, aodOffMin, typicalUsageMin, standByMin } =
                timeOnline;
              if (aodOnMin === undefined) {
                errors.push("battery AOD on time is required.");
              } else if (typeof aodOnMin !== "number" || aodOnMin < 0) {
                errors.push(
                  "battery AOD on time must be a non-negative number."
                );
              }
              if (aodOffMin === undefined) {
                errors.push("battery AOD off time is required.");
              } else if (typeof aodOffMin !== "number" || aodOffMin < 0) {
                errors.push(
                  "battery AOD off time must be a non-negative number."
                );
              }
              if (
                isPresent(typicalUsageMin) &&
                (typeof typicalUsageMin !== "number" || typicalUsageMin < 0)
              ) {
                errors.push(
                  "battery typical usage time must be a non-negative number."
                );
              }
              if (
                isPresent(standByMin) &&
                (typeof standByMin !== "number" || standByMin < 0)
              ) {
                errors.push(
                  "battery stand by time must be a non-negative number."
                );
              }
            }
            if (timeFullChargeMin === undefined) {
              errors.push("battery time full charge is required.");
            } else if (
              typeof timeFullChargeMin !== "number" ||
              timeFullChargeMin <= 0
            ) {
              errors.push(
                "battery time full charge must be a positive number."
              );
            }
            if (!chargingType) {
              errors.push("battery charging type is required.");
            } else if (typeof chargingType !== "string") {
              errors.push("battery charging type must be a non-empty string.");
            }
          }
          if (!screen) {
            errors.push("screen is required.");
          } else if (!isNoneArrObj(screen)) {
            errors.push("screen must be an object.");
          } else {
            const {
              display,
              brightness,
              resolution,
              glassMaterial,
              bezelMaterial,
              isCircular,
              diameterMm,
              dimension,
              shape,
            } = screen;
            if (!display) {
              errors.push("screen display is required.");
            } else if (!isNoneArrObj(display)) {
              errors.push("screen display must be an object.");
            } else {
              const { diagonalSizeInch, displayType } = display;
              if (diagonalSizeInch === undefined) {
                errors.push("screen display diagonal size is required.");
              } else if (
                typeof diagonalSizeInch !== "number" ||
                diagonalSizeInch <= 0
              ) {
                errors.push(
                  "screen display diagonal size must be a positive number."
                );
              }
              if (!displayType) {
                errors.push("screen display type is required.");
              } else if (typeof displayType !== "string") {
                errors.push("screen display type must be a non-empty string.");
              }
            }
            if (!brightness) {
              errors.push("screen brightness is required.");
            } else if (!isNoneArrObj(brightness)) {
              errors.push("screen brightness must be an object.");
            } else {
              const { minNits, maxNits } = brightness;
              if (minNits === undefined) {
                errors.push("screen brightness min nits is required.");
              } else if (typeof minNits !== "number" || minNits < 0) {
                errors.push(
                  "screen brightness min nits must be a non-negative number."
                );
              }
              if (maxNits === undefined) {
                errors.push("screen brightness max nits is required.");
              } else if (typeof maxNits !== "number" || maxNits < 0) {
                errors.push(
                  "screen brightness max nits must be a non-negative number."
                );
              }
            }
            if (!resolution) {
              errors.push("screen resolution is required.");
            } else if (!isNoneArrObj(resolution)) {
              errors.push("screen resolution must be an object.");
            } else {
              const { hPx, wPx } = resolution;
              if (hPx === undefined) {
                errors.push("screen resolution height pixels is required.");
              } else if (typeof hPx !== "number" || hPx <= 0) {
                errors.push(
                  "screen resolution height pixels must be a positive number."
                );
              }
              if (wPx === undefined) {
                errors.push("screen resolution width pixels is required.");
              } else if (typeof wPx !== "number" || wPx <= 0) {
                errors.push(
                  "screen resolution width pixels must be a positive number."
                );
              }
            }
            if (!glassMaterial) {
              errors.push("screen glass material is required.");
            } else if (typeof glassMaterial !== "string") {
              errors.push("screen glass material must be a non-empty string.");
            }
            if (!bezelMaterial) {
              errors.push("screen bezel material is required.");
            } else if (typeof bezelMaterial !== "string") {
              errors.push("screen bezel material must be a non-empty string.");
            }
            if (isCircular === undefined) {
              errors.push("screen isCircular is required.");
            } else if (typeof isCircular !== "boolean") {
              errors.push("screen isCircular must be a boolean.");
            } else if (isCircular) {
              if (diameterMm === undefined) {
                errors.push(
                  "screen diameter is required for circular screens."
                );
              } else if (typeof diameterMm !== "number" || diameterMm <= 0) {
                errors.push("screen diameter must be a positive number.");
              }
              if (isPresent(dimension)) {
                errors.push(
                  "screen dimension must be null or not provided for circular screens."
                );
              }
            } else if (!dimension) {
              // isCircular is false
              errors.push(
                "screen dimension is required for non-circular screens."
              );
            } else if (!isNoneArrObj(dimension)) {
              errors.push("screen dimension must be an object.");
            } else {
              const { wMm, hMm, thicknessMm } = dimension;
              if (wMm === undefined) {
                errors.push(
                  "screen width is required for non-circular screens."
                );
              } else if (typeof wMm !== "number" || wMm <= 0) {
                errors.push("screen width must be a positive number.");
              }
              if (hMm === undefined) {
                errors.push(
                  "screen height is required for non-circular screens."
                );
              } else if (typeof hMm !== "number" || hMm <= 0) {
                errors.push("screen height must be a positive number.");
              }
              if (thicknessMm === undefined) {
                errors.push(
                  "screen thickness is required for non-circular screens."
                );
              } else if (typeof thicknessMm !== "number" || thicknessMm <= 0) {
                errors.push("screen thickness must be a positive number.");
              }
              if (isPresent(diameterMm)) {
                errors.push(
                  "screen diameter must be null or not provided for non-circular screens."
                );
              }
            }
            if (!shape) {
              errors.push("screen shape is required.");
            } else if (typeof shape !== "string") {
              errors.push("screen shape must be a non-empty string.");
            }
          }
          if (!caseMaterial) {
            errors.push("case material is required.");
          } else if (typeof caseMaterial !== "string") {
            errors.push("case material must be a non-empty string.");
          }
          if (watchWeightMg === undefined) {
            errors.push("watch weight is required.");
          } else if (typeof watchWeightMg !== "number" || watchWeightMg <= 0) {
            errors.push("watch weight must be a positive number.");
          }
          if (compatibleBandLugWidthMm === undefined) {
            errors.push("compatible band lug width is required.");
          } else if (
            typeof compatibleBandLugWidthMm !== "number" ||
            compatibleBandLugWidthMm <= 0
          ) {
            errors.push("compatible band lug width must be a positive number.");
          }
          if (!releaseDate) {
            errors.push("release date is required.");
          } else if (!isValidDateTimeString(releaseDate)) {
            errors.push("release date must be a valid date time string.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
          }
          break;
        }
        case "update": {
          const {
            name,
            priceCents,
            stockPriceCents,
            imageUrls,
            feature,
            config,
            battery,
            screen,
            caseMaterial,
            watchWeightMg,
            compatibleBandLugWidthMm,
            releaseDate,
            stopSelling,
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (
            priceCents !== undefined &&
            (typeof priceCents !== "number" || priceCents < 0)
          ) {
            errors.push("price must be a non-negative number.");
          }
          if (
            stockPriceCents !== undefined &&
            (typeof stockPriceCents !== "number" || stockPriceCents < 0)
          ) {
            errors.push("stock price must be a non-negative number.");
          }
          if (
            isPresent(imageUrls) &&
            !(await isValidImgUrls(imageUrls, "product"))
          ) {
            errors.push("image URLs must be an array of valid image URLs.");
          }
          if (feature !== undefined) {
            if (!isNoneArrObj(feature)) {
              errors.push("feature must be an object.");
            } else if (!isEmptyObj(feature)) {
              const {
                speakerAndMicrophone,
                waterResistance,
                utilities,
                supportedAppsForNotifications,
              } = feature;

              if (
                speakerAndMicrophone !== undefined &&
                typeof speakerAndMicrophone !== "boolean"
              ) {
                errors.push("speakerAndMicrophone must be a boolean.");
              }
              if (isPresent(waterResistance)) {
                if (!isNoneArrObj(waterResistance)) {
                  errors.push("waterResistance must be an object.");
                } else if (!isEmptyObj(waterResistance)) {
                  // If empty obj nothing changes
                  const { rating, description } = waterResistance;

                  if (
                    rating !== undefined &&
                    (typeof rating !== "string" || !rating)
                  ) {
                    errors.push(
                      "waterResistance rating must be a non-empty string."
                    );
                  }
                  if (
                    isPresent(description) &&
                    (typeof description !== "string" || !description)
                  ) {
                    errors.push(
                      "waterResistance description must be a non-empty string."
                    );
                  }
                }
              }
              if (isPresent(utilities)) {
                if (!isNoneArrObj(utilities)) {
                  errors.push("utilities must be an object.");
                } else if (!isEmptyObj(utilities)) {
                  const { healths, sports, specials, others } = utilities;

                  if (
                    isPresent(healths) &&
                    !isArrayOfNonEmptyStrings(healths)
                  ) {
                    errors.push(
                      "utilities healths must be an array of non-empty strings."
                    );
                  }
                  if (isPresent(sports) && !isArrayOfNonEmptyStrings(sports)) {
                    errors.push(
                      "utilities sports must be an array of non-empty strings."
                    );
                  }
                  if (
                    isPresent(specials) &&
                    !isArrayOfNonEmptyStrings(specials)
                  ) {
                    errors.push(
                      "utilities specials must be an array of non-empty strings."
                    );
                  }
                  if (isPresent(others) && !isArrayOfNonEmptyStrings(others)) {
                    errors.push(
                      "utilities others must be an array of non-empty strings."
                    );
                  }
                }
              }
              if (
                isPresent(supportedAppsForNotifications) &&
                !isArrayOfNonEmptyStrings(supportedAppsForNotifications)
              ) {
                errors.push(
                  "supportedAppsForNotifications must be an array of non-empty strings."
                );
              }
            }
          }
          if (config !== undefined) {
            if (!isNoneArrObj(config)) {
              errors.push("config must be an object.");
            } else if (!isEmptyObj(config)) {
              const {
                connectivities,
                camera,
                chipset,
                memory,
                osId,
                compatiblePhoneOs,
                appsConnect,
                sensors,
              } = config;

              if (
                isPresent(connectivities) &&
                !isArrayOfNonEmptyStrings(connectivities)
              ) {
                errors.push(
                  "connectivities must be an array of non-empty strings."
                );
              }
              if (isPresent(camera)) {
                if (!isNoneArrObj(camera)) {
                  errors.push("camera must be an object.");
                } else if (!isEmptyObj(camera)) {
                  const { resolutionMp, features } = camera;
                  if (
                    resolutionMp !== undefined &&
                    (typeof resolutionMp !== "number" || resolutionMp < 0)
                  ) {
                    errors.push(
                      "camera resolution must be a non-negative number."
                    );
                  }
                  if (
                    isPresent(features) &&
                    !isArrayOfNonEmptyStrings(features)
                  ) {
                    errors.push(
                      "camera features must be an array of non-empty strings."
                    );
                  }
                }
              }
              if (
                chipset !== undefined &&
                (typeof chipset !== "string" || !chipset)
              ) {
                errors.push("chipset must be a non-empty string.");
              }
              if (memory !== undefined) {
                if (!isNoneArrObj(memory)) {
                  errors.push("memory must be an object.");
                } else if (!isEmptyObj(memory)) {
                  const { ramBytes, storageBytes } = memory;
                  if (
                    ramBytes !== undefined &&
                    (typeof ramBytes !== "number" || ramBytes < 0)
                  ) {
                    errors.push("memory RAM must be a non-negative number.");
                  }
                  if (
                    storageBytes !== undefined &&
                    (typeof storageBytes !== "number" || storageBytes < 0)
                  ) {
                    errors.push(
                      "memory storage must be a non-negative number."
                    );
                  }
                }
              }
              if (osId !== undefined && (typeof osId !== "string" || !osId)) {
                errors.push("OS ID must be a non-empty string.");
              }
              if (
                isPresent(compatiblePhoneOs) &&
                !isArrayOfNonEmptyStrings(compatiblePhoneOs)
              ) {
                errors.push(
                  "compatiblePhoneOs must be an array of non-empty strings."
                );
              }
              if (
                isPresent(appsConnect) &&
                !isArrayOfNonEmptyStrings(appsConnect)
              ) {
                errors.push(
                  "appsConnect must be an array of non-empty strings."
                );
              }
              if (isPresent(sensors) && !isArrayOfNonEmptyStrings(sensors)) {
                errors.push("sensors must be an array of non-empty strings.");
              }
            }
          }
          if (battery !== undefined) {
            if (!isNoneArrObj(battery)) {
              errors.push("battery must be an object.");
            } else if (!isEmptyObj(battery)) {
              const {
                capacityMah,
                timeOnline,
                timeFullChargeMin,
                chargingType,
              } = battery;
              if (
                capacityMah !== undefined &&
                (typeof capacityMah !== "number" || capacityMah <= 0)
              ) {
                errors.push("battery capacity must be a positive number.");
              }
              if (timeOnline !== undefined) {
                if (!isNoneArrObj(timeOnline)) {
                  errors.push("battery time online must be an object.");
                } else if (!isEmptyObj(timeOnline)) {
                  const { aodOnMin, aodOffMin, typicalUsageMin, standByMin } =
                    timeOnline;
                  if (
                    aodOnMin !== undefined &&
                    (typeof aodOnMin !== "number" || aodOnMin < 0)
                  ) {
                    errors.push(
                      "battery AOD on time must be a non-negative number."
                    );
                  }
                  if (
                    aodOffMin !== undefined &&
                    (typeof aodOffMin !== "number" || aodOffMin < 0)
                  ) {
                    errors.push(
                      "battery AOD off time must be a non-negative number."
                    );
                  }
                  if (
                    isPresent(typicalUsageMin) &&
                    (typeof typicalUsageMin !== "number" || typicalUsageMin < 0)
                  ) {
                    errors.push(
                      "battery typical usage time must be a non-negative number."
                    );
                  }
                  if (
                    isPresent(standByMin) &&
                    (typeof standByMin !== "number" || standByMin < 0)
                  ) {
                    errors.push(
                      "battery stand by time must be a non-negative number."
                    );
                  }
                }
              }
              if (
                timeFullChargeMin !== undefined &&
                (typeof timeFullChargeMin !== "number" ||
                  timeFullChargeMin <= 0)
              ) {
                errors.push(
                  "battery time full charge must be a positive number."
                );
              }
              if (
                chargingType !== undefined &&
                (typeof chargingType !== "string" || !chargingType)
              ) {
                errors.push(
                  "battery charging type must be a non-empty string."
                );
              }
            }
          }
          if (screen !== undefined) {
            if (!isNoneArrObj(screen)) {
              errors.push("screen must be an object.");
            } else if (!isEmptyObj(screen)) {
              const {
                display,
                brightness,
                resolution,
                glassMaterial,
                bezelMaterial,
                isCircular,
                diameterMm,
                dimension,
                shape,
              } = screen;
              if (display !== undefined) {
                if (!isNoneArrObj(display)) {
                  errors.push("screen display must be an object.");
                } else if (!isEmptyObj(display)) {
                  const { diagonalSizeInch, displayType } = display;
                  if (
                    diagonalSizeInch !== undefined &&
                    (typeof diagonalSizeInch !== "number" ||
                      diagonalSizeInch <= 0)
                  ) {
                    errors.push(
                      "screen display diagonal size must be a positive number."
                    );
                  }
                  if (
                    displayType !== undefined &&
                    (typeof displayType !== "string" || !displayType)
                  ) {
                    errors.push(
                      "screen display type must be a non-empty string."
                    );
                  }
                }
              }
              if (brightness !== undefined) {
                if (!isNoneArrObj(brightness)) {
                  errors.push("screen brightness must be an object.");
                } else if (!isEmptyObj(brightness)) {
                  const { minNits, maxNits } = brightness;
                  if (
                    minNits !== undefined &&
                    (typeof minNits !== "number" || minNits < 0)
                  ) {
                    errors.push(
                      "screen brightness min nits must be a non-negative number."
                    );
                  }
                  if (
                    maxNits !== undefined &&
                    (typeof maxNits !== "number" || maxNits < 0)
                  ) {
                    errors.push(
                      "screen brightness max nits must be a non-negative number."
                    );
                  }
                }
              }
              if (resolution !== undefined) {
                if (!isNoneArrObj(resolution)) {
                  errors.push("screen resolution must be an object.");
                } else if (!isEmptyObj(resolution)) {
                  const { hPx, wPx } = resolution;
                  if (
                    hPx !== undefined &&
                    (typeof hPx !== "number" || hPx <= 0)
                  ) {
                    errors.push(
                      "screen resolution height pixels must be a positive number."
                    );
                  }
                  if (
                    wPx !== undefined &&
                    (typeof wPx !== "number" || wPx <= 0)
                  ) {
                    errors.push(
                      "screen resolution width pixels must be a positive number."
                    );
                  }
                }
              }
              if (
                glassMaterial !== undefined &&
                (typeof glassMaterial !== "string" || !glassMaterial)
              ) {
                errors.push(
                  "screen glass material must be a non-empty string."
                );
              }
              if (
                bezelMaterial !== undefined &&
                (typeof bezelMaterial !== "string" || !bezelMaterial)
              ) {
                errors.push(
                  "screen bezel material must be a non-empty string."
                );
              }
              // Depending on isCircular, either diameterMm or dimension must be provided, handled in controllers
              // Just check valid data types, business logic will be handled in controllers
              if (isCircular !== undefined && typeof isCircular !== "boolean") {
                errors.push("screen isCircular must be a boolean.");
              }
              if (
                diameterMm !== undefined &&
                (typeof diameterMm !== "number" || diameterMm <= 0)
              ) {
                errors.push("screen diameter must be a positive number.");
              }
              if (dimension !== undefined) {
                if (!isNoneArrObj(dimension)) {
                  errors.push("screen dimension must be an object.");
                } else if (!isEmptyObj(dimension)) {
                  const { wMm, hMm, thicknessMm } = dimension;
                  if (
                    wMm !== undefined &&
                    (typeof wMm !== "number" || wMm <= 0)
                  ) {
                    errors.push("screen width must be a positive number.");
                  }
                  if (
                    hMm !== undefined &&
                    (typeof hMm !== "number" || hMm <= 0)
                  ) {
                    errors.push("screen height must be a positive number.");
                  }
                  if (
                    thicknessMm !== undefined &&
                    (typeof thicknessMm !== "number" || thicknessMm <= 0)
                  ) {
                    errors.push("screen thickness must be a positive number.");
                  }
                }
              }
              if (
                shape !== undefined &&
                (typeof shape !== "string" || !shape)
              ) {
                errors.push("screen shape must be a non-empty string.");
              }
            }
          }
          if (
            caseMaterial !== undefined &&
            (typeof caseMaterial !== "string" || !caseMaterial)
          ) {
            errors.push("case material must be a non-empty string.");
          }
          if (
            watchWeightMg !== undefined &&
            (typeof watchWeightMg !== "number" || watchWeightMg <= 0)
          ) {
            errors.push("watch weight must be a positive number.");
          }
          if (
            compatibleBandLugWidthMm !== undefined &&
            (typeof compatibleBandLugWidthMm !== "number" ||
              compatibleBandLugWidthMm <= 0)
          ) {
            errors.push("compatible band lug width must be a positive number.");
          }
          if (
            releaseDate !== undefined &&
            !isValidDateTimeString(releaseDate)
          ) {
            errors.push("release date must be a valid date time string.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("stopSelling must be a boolean.");
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

export function verifyModelVariationInput(
  type: "create" | "update"
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
            name,
            color,
            imageUrls,
            additionalPriceCents,
            band,
            stopSelling,
          } = req.body;

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
            supplierSerialNumber,
            supplierImeiNumber,
            conditionId,
            isActive,
          } = req.body;

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
