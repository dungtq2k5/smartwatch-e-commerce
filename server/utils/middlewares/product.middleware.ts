import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidProductName,
  isValidDateTimeString,
  isValidColorHex,
  isValidNumString,
  isValidListOfColorsHex,
} from "../../../common/utils.common";
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  PRODUCT_SEARCH_SORT_OPTIONS,
} from "../../../common/configs.common";
import { errorHandler } from "../errorHandler";
import { isArrayOfStrings, isValidImgUrls } from "../../utils/utils";

function sanitizeProductInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product input...");
  const { name, model, description } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof model === "string") {
    req.body.model = removeOddSpaces(model);
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
  console.log("▶️ ", "Sanitizing model variation input...");
  const { name, band } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (band) {
    if (typeof band.material === "string") {
      req.body.band.material = removeOddSpaces(band.material);
    }
    if (typeof band.claspType === "string") {
      req.body.band.claspType = removeOddSpaces(band.claspType);
    }
    if (typeof band.type === "string") {
      req.body.band.type = removeOddSpaces(band.type);
    }
  }

  next();
}

function sanitizeSearchProduct(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product search input...");
  const { searchTerm } = req.query;

  if (searchTerm && typeof searchTerm === "string") {
    req.query.searchTerm = removeOddSpaces(searchTerm);
  }

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
  const {
    model,
    name,
    display, // type
    connectivities,
    waterResistance,
    chipset,
    sensors,
    caseMaterial,
  } = req.body;

  if (typeof model === "string") {
    req.body.model = removeOddSpaces(model);
  }
  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (display.type && typeof display.type === "string") {
    req.body.display.type = removeOddSpaces(display.type);
  }
  if (isArrayOfStrings(connectivities)) {
    req.body.connectivities = connectivities.map((item: string) =>
      removeOddSpaces(item)
    );
  }
  if (typeof waterResistance === "string") {
    req.body.waterResistance = removeOddSpaces(waterResistance);
  }
  if (typeof chipset === "string") {
    req.body.chipset = removeOddSpaces(chipset);
  }
  if (isArrayOfStrings(sensors)) {
    req.body.sensors = sensors.map((item: string) => removeOddSpaces(item));
  }
  if (typeof caseMaterial === "string") {
    req.body.caseMaterial = removeOddSpaces(caseMaterial);
  }

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
      return sanitizeSearchProduct;
  }
}

export function verifyProductInput(
  type: "create" | "update" | "search"
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
            brandId,
            categoryId,
            imageUrls,
            description,
            stopSelling,
            basePriceCents,
          } = req.body;

          if (!name) {
            errors.push("Product name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `Product name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (!brandId) {
            errors.push("Product brand ID is required.");
          }
          if (!categoryId) {
            errors.push("Product category ID is required.");
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product image URLs must be an array of valid image URLs."
            );
          }
          if (typeof description !== "string" || !description) {
            errors.push("Product description is required.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("Product stopSelling must be a boolean.");
          }
          if (basePriceCents === undefined) {
            errors.push("Product base price is required.");
          } else if (typeof basePriceCents !== "number" || basePriceCents < 0) {
            errors.push("Product base price must be a non-negative number.");
          }
          break;
        }
        case "update": {
          console.log("Validating product update input...");
          const {
            name,
            brandId,
            categoryId,
            imageUrls,
            description,
            stopSelling,
            basePriceCents,
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `Product name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (
            brandId !== undefined &&
            (typeof brandId !== "string" || !brandId)
          ) {
            errors.push("Product brand ID must be a non-empty string.");
          }
          if (
            categoryId !== undefined &&
            (typeof categoryId !== "string" || !categoryId)
          ) {
            errors.push("Product category ID must be a non-empty string.");
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product image URLs must be an array of valid image URLs."
            );
          }
          if (
            description !== undefined &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("Product description must be a non-empty string.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("Product stopSelling must be a boolean.");
          }
          if (
            basePriceCents !== undefined &&
            (typeof basePriceCents !== "number" || basePriceCents < 0)
          ) {
            errors.push("Product base price must be a non-negative number.");
          }
          break;
        }
        case "search": {
          console.log("Validating product search input...");
          const {
            limit,
            offset,
            searchTerm,
            brandId,
            categoryId,
            stopSelling,
            priceCentsMin,
            priceCentsMax,
            sortBy,
          } = req.query;

          if (limit !== undefined && !isValidNumString(limit)) {
            errors.push("Product limit must be a valid number string.");
          }
          if (offset !== undefined && !isValidNumString(offset)) {
            errors.push("Product offset must be a valid number string.");
          }
          if (
            searchTerm !== undefined &&
            (typeof searchTerm !== "string" || !searchTerm)
          ) {
            errors.push("Product search term must be a non-empty string.");
          }
          if (
            brandId !== undefined &&
            (typeof brandId !== "string" || !brandId)
          ) {
            errors.push("Product brand ID must be a non-empty string.");
          }
          if (
            categoryId !== undefined &&
            (typeof categoryId !== "string" || !categoryId)
          ) {
            errors.push("Product category ID must be a non-empty string.");
          }
          if (
            stopSelling !== undefined &&
            !["true", "false"].includes(stopSelling as any)
          ) {
            errors.push("Product stopSelling must be a boolean string.");
          }
          if (priceCentsMin !== undefined) {
            if (!isValidNumString(priceCentsMin)) {
              errors.push(
                "Product priceCentsMin must be a valid number string."
              );
            } else if (parseInt(priceCentsMin as string, 10) < 0) {
              errors.push(
                "Product priceCentsMin must be a non-negative number."
              );
            }
          }
          if (priceCentsMax !== undefined) {
            if (!isValidNumString(priceCentsMax)) {
              errors.push(
                "Product priceCentsMax must be a valid number string."
              );
            } else if (parseInt(priceCentsMax as string, 10) < 0) {
              errors.push(
                "Product priceCentsMax must be a non-negative number."
              );
            }
          }
          if (
            priceCentsMin !== undefined &&
            priceCentsMax !== undefined &&
            parseInt(priceCentsMin as string, 10) >
              parseInt(priceCentsMax as string, 10)
          ) {
            errors.push(
              "Product priceCentsMin cannot be greater than priceCentsMax."
            );
          }
          if (
            sortBy !== undefined &&
            !PRODUCT_SEARCH_SORT_OPTIONS.includes(sortBy as any)
          ) {
            errors.push(
              `Product sortBy must be one of the following: ${PRODUCT_SEARCH_SORT_OPTIONS.join(
                ", "
              )}`
            );
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
            errors.push("Product brand name is required.");
          } else if (typeof name !== "string" || !name) {
            errors.push("Product brand name must be a non-empty string.");
          }
          if (logoUrl !== undefined && !(await isValidImgUrls(logoUrl))) {
            errors.push("Product brand logo URL must be a valid image URL.");
          }
          if (
            description !== undefined &&
            (typeof description !== "string" || !description)
          ) {
            errors.push(
              "Product brand description must be a non-empty string."
            );
          }
          break;
        }
        case "update": {
          const { name, logoUrl, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Product brand name must be a non-empty string.");
          }
          if (
            logoUrl !== undefined &&
            logoUrl !== null &&
            !(await isValidImgUrls(logoUrl))
          ) {
            errors.push(
              "Product brand logo URL must be a valid image URL or null."
            );
          }
          if (
            description !== undefined &&
            description !== null &&
            (typeof description !== "string" || !description)
          ) {
            errors.push(
              "Product brand description must be a non-empty string or null."
            );
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
            errors.push("Product category name is required.");
          } else if (typeof name !== "string" || !name) {
            errors.push("Product category name must be a non-empty string.");
          }
          if (
            description !== undefined &&
            (typeof description !== "string" || !description)
          ) {
            errors.push(
              "Product category description must be a non-empty string."
            );
          }
          break;
        }
        case "update": {
          const { name, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Product category name must be a non-empty string.");
          }
          if (
            description !== undefined &&
            description !== null &&
            (typeof description !== "string" || !description)
          ) {
            errors.push(
              "Product category description must be a non-empty string or null."
            );
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
            errors.push("Product OS name is required.");
          } else if (typeof name !== "string" || !name) {
            errors.push("Product OS name must be a non-empty string.");
          }
          if (logoUrl !== undefined && !(await isValidImgUrls(logoUrl))) {
            errors.push("Product OS logo URL must be a valid image URL.");
          }
          if (
            description !== undefined &&
            (typeof description !== "string" || !description)
          ) {
            errors.push("Product OS description must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name, logoUrl, description } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Product OS name must be a non-empty string.");
          }
          if (
            logoUrl !== undefined &&
            logoUrl !== null &&
            !(await isValidImgUrls(logoUrl))
          ) {
            errors.push("Product OS logo URL must be a valid image URL.");
          }
          if (
            description !== undefined &&
            description !== null &&
            (typeof description !== "string" || !description)
          ) {
            errors.push(
              "Product OS description must be a non-empty string or null."
            );
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
            model,
            name,
            watchSizeMm,
            priceCents,
            stockPriceCents,
            imageUrls,
            display,
            resolution,
            memory,
            osId,
            chipset,
            connectivities,
            batteryLifeMah,
            waterResistance,
            sensors,
            caseMaterial,
            weightMg,
            compatibleBandLugWidthMm,
            releaseDate,
            stopSelling,
          } = req.body;

          if (!model) {
            errors.push("Product model model is required.");
          } else if (!isValidProductName(model)) {
            errors.push(
              `Product model model must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (!name) {
            errors.push("Product model name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `Product model name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (watchSizeMm === undefined) {
            errors.push("Product model watch size is required.");
          } else if (typeof watchSizeMm !== "number" || watchSizeMm <= 0) {
            errors.push("Product model watch size must be a positive number.");
          }
          if (priceCents === undefined) {
            errors.push("Product model price is required.");
          } else if (typeof priceCents !== "number" || priceCents < 0) {
            errors.push("Product model price must be a non-negative number.");
          }
          if (stockPriceCents === undefined) {
            errors.push("Product model stock price is required.");
          } else if (
            typeof stockPriceCents !== "number" ||
            stockPriceCents < 0
          ) {
            errors.push(
              "Product model stock price must be a non-negative number."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model image URLs must be an array of valid image URLs."
            );
          }
          if (!display) {
            errors.push("Product model display is required.");
          } else {
            if (display.sizeMm === undefined) {
              errors.push("Product model display size is required.");
            } else if (
              typeof display.sizeMm !== "number" ||
              display.sizeMm <= 0
            ) {
              errors.push(
                "Product model display size must be a positive number."
              );
            }
            if (!display.type) {
              errors.push("Product model display type is required.");
            } else if (typeof display.type !== "string" || !display.type) {
              errors.push(
                "Product model display type must be a non-empty string."
              );
            }
          }
          if (!resolution) {
            errors.push("Product model resolution is required.");
          } else {
            if (resolution.hPx === undefined) {
              errors.push("Product model resolution H is required.");
            } else if (
              typeof resolution.hPx !== "number" ||
              resolution.hPx <= 0
            ) {
              errors.push(
                "Product model resolution H must be a positive number."
              );
            }
            if (resolution.wPx === undefined) {
              errors.push("Product model resolution W is required.");
            } else if (
              typeof resolution.wPx !== "number" ||
              resolution.wPx <= 0
            ) {
              errors.push(
                "Product model resolution W must be a positive number."
              );
            }
          }
          if (!memory) {
            errors.push("Product model memory is required.");
          } else {
            if (memory.ramBytes === undefined) {
              errors.push("Product model RAM is required.");
            } else if (
              typeof memory.ramBytes !== "number" ||
              memory.ramBytes < 0
            ) {
              errors.push("Product model RAM must be a non-negative number.");
            }
            if (memory.romBytes === undefined) {
              errors.push("Product model ROM is required.");
            } else if (
              typeof memory.romBytes !== "number" ||
              memory.romBytes < 0
            ) {
              errors.push("Product model ROM must be a non-negative number.");
            }
          }
          if (!osId) {
            errors.push("Product model OS ID is required.");
          } else if (typeof osId !== "string" || !osId) {
            errors.push("Product model OS ID must be a non-empty string.");
          }
          if (!chipset) {
            errors.push("Product model chipset is required.");
          } else if (typeof chipset !== "string" || !chipset) {
            errors.push("Product model chipset must be a non-empty string.");
          }
          if (!connectivities) {
            errors.push("Product model connectivities are required.");
          } else if (
            !isArrayOfStrings(connectivities) ||
            !connectivities.length
          ) {
            errors.push(
              "Product model connectivities must be a non-empty array of strings."
            );
          }
          if (batteryLifeMah === undefined) {
            errors.push("Product model battery life is required.");
          } else if (
            typeof batteryLifeMah !== "number" ||
            batteryLifeMah <= 0
          ) {
            errors.push(
              "Product model battery life must be a positive number."
            );
          }
          if (!waterResistance) {
            errors.push("Product model water resistance is required.");
          } else if (typeof waterResistance !== "string" || !waterResistance) {
            errors.push(
              "Product model water resistance must be a non-empty string."
            );
          }
          if (!sensors) {
            errors.push("Product model sensors is required.");
          } else if (!isArrayOfStrings(sensors) || !sensors.length) {
            errors.push(
              "Product model sensors must be a non-empty array of strings."
            );
          }
          if (!caseMaterial) {
            errors.push("Product model case material is required.");
          } else if (typeof caseMaterial !== "string" || !caseMaterial) {
            errors.push(
              "Product model case material must be a non-empty string."
            );
          }
          if (weightMg === undefined) {
            errors.push("Product model weight is required.");
          } else if (typeof weightMg !== "number" || weightMg <= 0) {
            errors.push("Product model weight must be a positive number.");
          }
          if (compatibleBandLugWidthMm === undefined) {
            errors.push("Product model compatible band lug width is required.");
          } else if (
            typeof compatibleBandLugWidthMm !== "number" ||
            compatibleBandLugWidthMm <= 0
          ) {
            errors.push(
              "Product model compatible band lug width must be a positive number."
            );
          }
          if (
            releaseDate !== undefined &&
            !isValidDateTimeString(releaseDate)
          ) {
            errors.push(
              "Product model release date must be a valid date time string."
            );
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("Product model stopSelling must be a boolean.");
          }
          break;
        }
        case "update": {
          const {
            model,
            name,
            watchSizeMm,
            priceCents,
            stockPriceCents,
            imageUrls,
            display,
            resolution,
            memory,
            osId,
            chipset,
            connectivities,
            batteryLifeMah,
            waterResistance,
            sensors,
            caseMaterial,
            weightMg,
            compatibleBandLugWidthMm,
            releaseDate,
            stopSelling,
          } = req.body;

          if (model !== undefined && !isValidProductName(model)) {
            errors.push(
              `Product model model must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `Product model name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (
            watchSizeMm !== undefined &&
            (typeof watchSizeMm !== "number" || watchSizeMm <= 0)
          ) {
            errors.push("Product model watch size must be a positive number.");
          }
          if (
            priceCents !== undefined &&
            (typeof priceCents !== "number" || priceCents < 0)
          ) {
            errors.push("Product model price must be a non-negative number.");
          }
          if (
            stockPriceCents !== undefined &&
            (typeof stockPriceCents !== "number" || stockPriceCents < 0)
          ) {
            errors.push(
              "Product model stock price must be a non-negative number."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model image URLs must be an array of valid image URLs."
            );
          }
          if (display !== undefined) {
            if (
              display.sizeMm !== undefined &&
              (typeof display.sizeMm !== "number" || display.sizeMm <= 0)
            ) {
              errors.push(
                "Product model display size must be a positive number."
              );
            }
            if (
              display.type !== undefined &&
              (typeof display.type !== "string" || !display.type)
            ) {
              errors.push(
                "Product model display type must be a non-empty string."
              );
            }
          }
          if (resolution !== undefined) {
            if (
              resolution.hPx !== undefined &&
              (typeof resolution.hPx !== "number" || resolution.hPx <= 0)
            ) {
              errors.push(
                "Product model resolution H must be a positive number."
              );
            }
            if (
              resolution.wPx !== undefined &&
              (typeof resolution.wPx !== "number" || resolution.wPx <= 0)
            ) {
              errors.push(
                "Product model resolution W must be a positive number."
              );
            }
          }
          if (memory !== undefined) {
            if (
              memory.ramBytes !== undefined &&
              (typeof memory.ramBytes !== "number" || memory.ramBytes < 0)
            ) {
              errors.push("Product model RAM must be a non-negative number.");
            }
            if (
              memory.romBytes !== undefined &&
              (typeof memory.romBytes !== "number" || memory.romBytes < 0)
            ) {
              errors.push("Product model ROM must be a non-negative number.");
            }
          }
          if (osId !== undefined && (typeof osId !== "string" || !osId)) {
            errors.push("Product model OS ID must be a non-empty string.");
          }
          if (
            chipset !== undefined &&
            (typeof chipset !== "string" || !chipset)
          ) {
            errors.push("Product model chipset must be a non-empty string.");
          }
          if (
            connectivities !== undefined &&
            (!isArrayOfStrings(connectivities) || !connectivities.length)
          ) {
            errors.push(
              "Product model connectivities must be a non-empty array of strings."
            );
          }
          if (
            batteryLifeMah !== undefined &&
            (typeof batteryLifeMah !== "number" || batteryLifeMah <= 0)
          ) {
            errors.push(
              "Product model battery life must be a positive number."
            );
          }
          if (
            waterResistance !== undefined &&
            (typeof waterResistance !== "string" || !waterResistance)
          ) {
            errors.push(
              "Product model water resistance must be a non-empty string."
            );
          }
          if (
            sensors !== undefined &&
            (!isArrayOfStrings(sensors) || !sensors.length)
          ) {
            errors.push(
              "Product model sensors must be a non-empty array of strings."
            );
          }
          if (
            caseMaterial !== undefined &&
            (typeof caseMaterial !== "string" || !caseMaterial)
          ) {
            errors.push(
              "Product model case material must be a non-empty string."
            );
          }
          if (
            weightMg !== undefined &&
            (typeof weightMg !== "number" || weightMg <= 0)
          ) {
            errors.push("Product model weight must be a positive number.");
          }
          if (
            compatibleBandLugWidthMm !== undefined &&
            (typeof compatibleBandLugWidthMm !== "number" ||
              compatibleBandLugWidthMm <= 0)
          ) {
            errors.push(
              "Product model compatible band lug width must be a positive number."
            );
          }
          if (
            releaseDate !== undefined &&
            !isValidDateTimeString(releaseDate)
          ) {
            errors.push(
              "Product model release date must be a valid date time string."
            );
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("Product model stopSelling must be a boolean.");
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

export function verifyModelVariationInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating product model variation input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const {
            name,
            colorHex,
            imageUrls, // Optional
            additionalPriceCents, // Optional
            band,
            stopSelling, // Optional
          } = req.body;

          if (!name) {
            errors.push("Product model variation name is required.");
          } else if (!isValidProductName(name)) {
            errors.push(
              `Product model variation name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (!colorHex) {
            errors.push("Product model variation color hex is required.");
          } else if (!isValidColorHex(colorHex)) {
            errors.push(
              "Product model variation color hex must be a valid color hex."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model variation image URLs must be an array of valid image URLs."
            );
          }
          if (
            additionalPriceCents !== undefined &&
            (typeof additionalPriceCents !== "number" ||
              additionalPriceCents < 0)
          ) {
            errors.push(
              "Product model variation additional price must be a non-negative number."
            );
          }

          if (!band) {
            errors.push("Product model variation band is required.");
          } else {
            if (band.lugWidthMm === undefined) {
              errors.push(
                "Product model variation band lug width is required."
              );
            } else if (
              typeof band.lugWidthMm !== "number" ||
              band.lugWidthMm <= 0
            ) {
              errors.push(
                "Product model variation band lug width must be a positive number."
              );
            }
            if (!band.material) {
              errors.push("Product model variation band material is required.");
            } else if (typeof band.material !== "string" || !band.material) {
              errors.push(
                "Product model variation band material must be a non-empty string."
              );
            }
            if (!band.colorsHex) {
              errors.push(
                "Product model variation band colors hex are required."
              );
            } else if (!isValidListOfColorsHex(band.colorsHex)) {
              errors.push(
                "Product model variation band colors hex must be a list of valid colors hex."
              );
            }
            if (!band.claspType) {
              errors.push(
                "Product model variation band clasp type is required."
              );
            } else if (typeof band.claspType !== "string" || !band.claspType) {
              errors.push(
                "Product model variation band clasp type must be a non-empty string."
              );
            }
            if (
              !band.adjustableRangeMm ||
              typeof band.adjustableRangeMm.min !== "number" ||
              typeof band.adjustableRangeMm.max !== "number"
            ) {
              errors.push(
                "Product model variation band adjustable range is required and must have numeric min and max properties."
              );
            } else if (
              band.adjustableRangeMm.min <= 0 ||
              band.adjustableRangeMm.max <= 0
            ) {
              errors.push(
                "Product model variation band adjustable range min and max must be positive numbers."
              );
            } else if (
              band.adjustableRangeMm.min >= band.adjustableRangeMm.max
            ) {
              errors.push(
                "Product model variation band adjustable range min must be less than max."
              );
            }
            if (!band.style) {
              errors.push("Product model variation band style is required.");
            } else if (typeof band.style !== "string" || !band.style) {
              errors.push(
                "Product model variation band style must be a non-empty string."
              );
            }
            if (
              band.quickRelease !== undefined &&
              typeof band.quickRelease !== "boolean"
            ) {
              errors.push(
                "Product model variation band quick release must be a boolean."
              );
            }
            if (
              band.waterResistance !== undefined &&
              typeof band.waterResistance !== "boolean"
            ) {
              errors.push(
                "Product model variation band water resistance must be a boolean."
              );
            }
            if (
              band.hypoallergenic !== undefined &&
              typeof band.hypoallergenic !== "boolean"
            ) {
              errors.push(
                "Product model variation band hypoallergenic must be a boolean."
              );
            }
            if (band.weightMg === undefined) {
              errors.push("Product model variation band weight is required.");
            } else if (
              typeof band.weightMg !== "number" ||
              band.weightMg <= 0
            ) {
              errors.push(
                "Product model variation band weight must be a positive number."
              );
            }
          }

          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push(
              "Product model variation stopSelling must be a boolean."
            );
          }
          break;
        }
        case "update": {
          const {
            name,
            colorHex,
            imageUrls, // Optional
            additionalPriceCents, // Optional
            band,
            stopSelling, // Optional
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `Product model variation name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (colorHex !== undefined && !isValidColorHex(colorHex)) {
            errors.push(
              "Product model variation color hex must be a valid color hex."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model variation image URLs must be an array of valid image URLs."
            );
          }
          if (
            additionalPriceCents !== undefined &&
            (typeof additionalPriceCents !== "number" ||
              additionalPriceCents < 0)
          ) {
            errors.push(
              "Product model variation additional price must be a non-negative number."
            );
          }
          if (band !== undefined) {
            if (
              band.lugWidthMm !== undefined &&
              (typeof band.lugWidthMm !== "number" || band.lugWidthMm <= 0)
            ) {
              errors.push(
                "Product model variation band lug width must be a positive number."
              );
            }
            if (
              band.material !== undefined &&
              (typeof band.material !== "string" || !band.material)
            ) {
              errors.push(
                "Product model variation band material must be a non-empty string."
              );
            }
            if (
              band.colorsHex !== undefined &&
              !isValidListOfColorsHex(band.colorsHex)
            ) {
              errors.push(
                "Product model variation band colors hex must be a list of valid colors hex."
              );
            }
            if (
              band.claspType !== undefined &&
              (typeof band.claspType !== "string" || !band.claspType)
            ) {
              errors.push(
                "Product model variation band clasp type must be a non-empty string."
              );
            }
            if (band.adjustableRangeMm !== undefined) {
              if (
                band.adjustableRangeMm.min !== undefined &&
                (typeof band.adjustableRangeMm.min !== "number" ||
                  band.adjustableRangeMm.min <= 0)
              ) {
                errors.push(
                  "Product model variation band adjustable range min must be a positive number."
                );
              }
              if (
                band.adjustableRangeMm.max !== undefined &&
                (typeof band.adjustableRangeMm.max !== "number" ||
                  band.adjustableRangeMm.max <= 0)
              ) {
                errors.push(
                  "Product model variation band adjustable range max must be a positive number."
                );
              }
            }
            if (
              band.style !== undefined &&
              (typeof band.style !== "string" || !band.style)
            ) {
              errors.push(
                "Product model variation band style must be a non-empty string."
              );
            }
            if (
              band.quickRelease !== undefined &&
              typeof band.quickRelease !== "boolean"
            ) {
              errors.push(
                "Product model variation band quick release must be a boolean."
              );
            }
            if (
              band.waterResistance !== undefined &&
              typeof band.waterResistance !== "boolean"
            ) {
              errors.push(
                "Product model variation band water resistance must be a boolean."
              );
            }
            if (
              band.hypoallergenic !== undefined &&
              typeof band.hypoallergenic !== "boolean"
            ) {
              errors.push(
                "Product model variation band hypoallergenic must be a boolean."
              );
            }
            if (
              band.weightMg !== undefined &&
              (typeof band.weightMg !== "number" || band.weightMg <= 0)
            ) {
              errors.push(
                "Product model variation band weight must be a positive number."
              );
            }
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push(
              "Product model variation stopSelling must be a boolean."
            );
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

export function verifyVariationInstanceInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating variation instance input...");

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
          } else if (
            typeof supplierSerialNumber !== "string" ||
            !supplierSerialNumber
          ) {
            errors.push(
              "Variation instance supplier serial number must be a none-empty string."
            );
          }
          if (
            supplierImeiNumber !== undefined &&
            (typeof supplierImeiNumber !== "string" || !supplierImeiNumber)
          ) {
            errors.push(
              "Variation instance supplier IMEI number must be a none-empty string."
            );
          }
          if (
            conditionId !== undefined &&
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
            supplierImeiNumber !== undefined &&
            supplierImeiNumber !== null &&
            (typeof supplierImeiNumber !== "string" || !supplierImeiNumber)
          ) {
            errors.push(
              "Variation instance supplier IMEI number must be a none-empty string or null."
            );
          }
          if (
            conditionId !== undefined &&
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
        return next(errorHandler(400, errors));
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
