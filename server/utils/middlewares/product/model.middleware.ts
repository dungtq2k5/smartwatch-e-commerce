import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidProductName,
  isValidDateTimeString,
  isValidNumString,
  removeAllSpaces,
  isNoneArrObj,
  isEmptyObj,
  isValidBooleanString,
} from "../../../../common/utils.common";
import {
  PRODUCT_MODEL_SEARCH_SORT_OPTIONS,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
} from "../../../../common/configs.common";
import { HttpError } from "../../errorHandler";
import {
  isArrayOfNonEmptyStrings,
  isPresent,
  isValidImgUrls,
} from "../../utils";
import { isValidObjectId } from "mongoose";

function sanitizeModelInput(
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

function sanitizeModelSearchInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product model search input...");
  // Since req.query can't be modifiable so we create a new query obj for the request
  const sanitizedQuery = { ...req.query };
  const { searchTerm, stopSelling } = sanitizedQuery;

  if (typeof searchTerm === "string") {
    sanitizedQuery.searchTerm = removeOddSpaces(searchTerm);
  }
  if (typeof stopSelling === "string") {
    sanitizedQuery.stopSelling = removeAllSpaces(stopSelling.toLowerCase());
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeModelDetailQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product model detail query input...");
  const sanitizedQuery = { ...req.query };
  const { variationStopSelling } = sanitizedQuery;

  if (typeof variationStopSelling === "string") {
    sanitizedQuery.variationStopSelling = removeAllSpaces(
      variationStopSelling.toLowerCase()
    );
  }

  req["sanitizedQuery"] = sanitizedQuery;
  next();
}

function sanitizeModelDeleteManyInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product model delete many input...");
  const { modelIds } = req.body;

  // Auto remove duplicates
  if (modelIds && Array.isArray(modelIds)) {
    req.body.modelIds = Array.from(new Set(modelIds));
  }

  next();
}

export function inputSanitizer(
  type:
    | "model"
    | "model search"
    | "admin model search"
    | "model details"
    | "admin model details"
    | "delete many"
): (req: Request, res: Response, next: NextFunction) => void {
  switch (type) {
    case "model":
      return sanitizeModelInput;
    case "model search":
    case "admin model search":
      return sanitizeModelSearchInput;
    case "model details":
    case "admin model details":
      return sanitizeModelDetailQuery;
    case "delete many":
      return sanitizeModelDeleteManyInput;
  }
}

export function verifyModelInput(
  type:
    | "create"
    | "update"
    | "search"
    | "admin search"
    | "details"
    | "admin details"
    | "delete many"
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
            productId,
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

          if (!productId) {
            errors.push("productId is required.");
          } else if (!isValidObjectId(productId)) {
            errors.push("productId must be a valid ObjectId string.");
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
              refreshRateHz,
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
            if (
              refreshRateHz !== undefined &&
              (typeof refreshRateHz !== "number" || refreshRateHz <= 0)
            ) {
              errors.push("screen refresh rate must be a positive number.");
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
                refreshRateHz,
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
                isPresent(diameterMm) &&
                (typeof diameterMm !== "number" || diameterMm <= 0)
              ) {
                errors.push("screen diameter must be a positive number.");
              }
              if (isPresent(dimension)) {
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
              if (
                refreshRateHz !== undefined &&
                (typeof refreshRateHz !== "number" || refreshRateHz <= 0)
              ) {
                errors.push("screen refresh rate must be a positive number.");
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
        case "search":
        case "admin search": {
          const {
            limit,
            offset,
            searchTerm,
            priceCentsMin,
            priceCentsMax,
            stockPriceCentsMin,
            stockPriceCentsMax,
            releaseDateFrom,
            releaseDateTo,
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
          if (priceCentsMin !== undefined) {
            if (!isValidNumString(priceCentsMin)) {
              errors.push("priceCentsMin must be a valid number string.");
            } else if (Number.parseInt(priceCentsMin, 10) < 0) {
              errors.push("priceCentsMin must be a non-negative number.");
            }
          }
          if (priceCentsMax !== undefined) {
            if (!isValidNumString(priceCentsMax)) {
              errors.push("priceCentsMax must be a valid number string.");
            } else if (Number.parseInt(priceCentsMax, 10) < 0) {
              errors.push("priceCentsMax must be a non-negative number.");
            }
          }
          if (
            priceCentsMin !== undefined &&
            priceCentsMax !== undefined &&
            Number.parseInt(priceCentsMin, 10) >
              Number.parseInt(priceCentsMax, 10)
          ) {
            errors.push("priceCentsMin cannot be greater than priceCentsMax.");
          }
          if (stockPriceCentsMin !== undefined) {
            if (!isValidNumString(stockPriceCentsMin)) {
              errors.push("stockPriceCentsMin must be a valid number string.");
            } else if (Number.parseInt(stockPriceCentsMin, 10) < 0) {
              errors.push("stockPriceCentsMin must be a non-negative number.");
            }
          }
          if (stockPriceCentsMax !== undefined) {
            if (!isValidNumString(stockPriceCentsMax)) {
              errors.push("stockPriceCentsMax must be a valid number string.");
            } else if (Number.parseInt(stockPriceCentsMax, 10) < 0) {
              errors.push("stockPriceCentsMax must be a non-negative number.");
            }
          }
          if (
            stockPriceCentsMin !== undefined &&
            stockPriceCentsMax !== undefined &&
            Number.parseInt(stockPriceCentsMin, 10) >
              Number.parseInt(stockPriceCentsMax, 10)
          ) {
            errors.push(
              "stockPriceCentsMin cannot be greater than stockPriceCentsMax."
            );
          }
          if (
            releaseDateFrom !== undefined &&
            !isValidDateTimeString(releaseDateFrom)
          ) {
            errors.push("releaseDateFrom must be a valid date time string.");
          }
          if (
            releaseDateTo !== undefined &&
            !isValidDateTimeString(releaseDateTo)
          ) {
            errors.push("releaseDateTo must be a valid date time string.");
          }
          if (
            releaseDateFrom !== undefined &&
            releaseDateTo !== undefined &&
            new Date(releaseDateFrom) > new Date(releaseDateTo)
          ) {
            errors.push("releaseDateFrom cannot be later than releaseDateTo.");
          }
          if (stopSelling !== undefined && !isValidBooleanString(stopSelling)) {
            errors.push("stopSelling must be a valid boolean string.");
          }
          if (
            sortBy !== undefined &&
            !PRODUCT_MODEL_SEARCH_SORT_OPTIONS.includes(sortBy)
          ) {
            errors.push(
              `sortBy must be one of the following: ${PRODUCT_MODEL_SEARCH_SORT_OPTIONS.join(
                ", "
              )}.`
            );
          }
          break;
        }
        case "details":
        case "admin details": {
          const { variationStopSelling } = req["sanitizedQuery"] || req.query;

          if (
            variationStopSelling !== undefined &&
            !isValidBooleanString(variationStopSelling)
          ) {
            errors.push("variationStopSelling must be a valid boolean string.");
          }

          break;
        }
        case "delete many": {
          const { modelIds } = req.body;

          if (!Array.isArray(modelIds) || modelIds.length === 0) {
            errors.push("modelIds must be a non-empty array.");
          } else {
            for (const [idx, id] of modelIds.entries()) {
              if (typeof id !== "string" || !id) {
                errors.push(
                  `modelIds[${idx}] is invalid. Each modelId must be a non-empty string.`
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
