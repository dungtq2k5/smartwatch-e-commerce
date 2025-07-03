import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidProductName,
  isValidDateTimeString,
  isValidHexColor,
} from "../../../common/utils.common";
import {
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
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

function sanitizeSimpleNameInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing simple name input...");
  const { name } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }

  next();
}

function sanitizeModelVariationInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing model variation input...");
  const { name, material } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof material === "string") {
    req.body.material = removeOddSpaces(material);
  }

  next();
}

const sanitizeBrandInput = sanitizeSimpleNameInput;
const sanitizeCategoryInput = sanitizeSimpleNameInput;
const sanitizeOsInput = sanitizeSimpleNameInput;

function sanitizeProductModelInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing product model input...");
  const {
    model,
    name,
    displayType,
    connectivities,
    waterResistanceUnit,
    sensors,
    caseMaterial,
  } = req.body;

  if (typeof model === "string") {
    req.body.model = removeOddSpaces(model);
  }
  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof displayType === "string") {
    req.body.displayType = removeOddSpaces(displayType);
  }
  if (isArrayOfStrings(connectivities)) {
    req.body.connectivities = connectivities.map((item: string) =>
      removeOddSpaces(item)
    );
  }
  if (typeof waterResistanceUnit === "string") {
    req.body.waterResistanceUnit = removeOddSpaces(waterResistanceUnit);
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
  type: "product" | "brand" | "category" | "os" | "model" | "variation"
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
  }
}

export function verifyProductInput(
  type: "create" | "update"
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
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `Product name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (brandId !== undefined && typeof brandId !== "string") {
            errors.push("Product brand ID must be a string.");
          }
          if (categoryId !== undefined && typeof categoryId !== "string") {
            errors.push("Product category ID must be a string.");
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product image URLs must be an array of valid image URLs."
            );
          }
          if (description !== undefined && typeof description !== "string") {
            errors.push("Product description must be a string.");
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push("Product stopSelling must be a boolean.");
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
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating product brand input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name } = req.body;

          if (!name) {
            errors.push("Product brand name is required.");
          } else if (typeof name !== "string" || !name) {
            errors.push("Product brand name must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Product brand name must be a non-empty string.");
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
          const { name } = req.body;

          if (!name) {
            errors.push("Product category name is required.");
          } else if (typeof name !== "string" || !name) {
            errors.push("Product category name must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Product category name must be a non-empty string.");
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
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating product OS input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "create": {
          const { name } = req.body;

          if (!name) {
            errors.push("Product OS name is required.");
          } else if (typeof name !== "string" || !name) {
            errors.push("Product OS name must be a non-empty string.");
          }
          break;
        }
        case "update": {
          const { name } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("Product OS name must be a non-empty string.");
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
            basePriceCents,
            imageUrls,
            displaySizeMm,
            displayType,
            resolutionHPx,
            resolutionWPx,
            ramBytes,
            romBytes,
            osId,
            connectivities,
            batteryLifeMah,
            waterResistanceValue,
            waterResistanceUnit,
            sensors,
            caseMaterial,
            weightMg,
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
          if (watchSizeMm === undefined || watchSizeMm === null) {
            errors.push("Product model watch size is required.");
          } else if (typeof watchSizeMm !== "number" || watchSizeMm <= 0) {
            errors.push("Product model watch size must be a positive number.");
          }
          if (priceCents === undefined || priceCents === null) {
            errors.push("Product model price is required.");
          } else if (typeof priceCents !== "number" || priceCents < 0) {
            errors.push("Product model price must be a non-negative number.");
          }
          if (basePriceCents === undefined || basePriceCents === null) {
            errors.push("Product model base price is required.");
          } else if (typeof basePriceCents !== "number" || basePriceCents < 0) {
            errors.push(
              "Product model base price must be a non-negative number."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model image URLs must be an array of valid image URLs."
            );
          }
          if (displaySizeMm === undefined || displaySizeMm === null) {
            errors.push("Product model display size is required.");
          } else if (typeof displaySizeMm !== "number" || displaySizeMm <= 0) {
            errors.push(
              "Product model display size must be a positive number."
            );
          }
          if (!displayType) {
            errors.push("Product model display type is required.");
          } else if (typeof displayType !== "string" || !displayType) {
            errors.push(
              "Product model display type must be a non-empty string."
            );
          }
          if (resolutionHPx === undefined || resolutionHPx === null) {
            errors.push("Product model resolution H is required.");
          } else if (typeof resolutionHPx !== "number" || resolutionHPx <= 0) {
            errors.push(
              "Product model resolution H must be a positive number."
            );
          }
          if (resolutionWPx === undefined || resolutionWPx === null) {
            errors.push("Product model resolution W is required.");
          } else if (typeof resolutionWPx !== "number" || resolutionWPx <= 0) {
            errors.push(
              "Product model resolution W must be a positive number."
            );
          }
          if (ramBytes === undefined || ramBytes === null) {
            errors.push("Product model RAM is required.");
          } else if (typeof ramBytes !== "number" || ramBytes < 0) {
            errors.push("Product model RAM must be a non-negative number.");
          }
          if (romBytes === undefined || romBytes === null) {
            errors.push("Product model ROM is required.");
          } else if (typeof romBytes !== "number" || romBytes < 0) {
            errors.push("Product model ROM must be a non-negative number.");
          }
          if (!osId) {
            errors.push("Product model OS ID is required.");
          } else if (typeof osId !== "string") {
            errors.push("Product model OS ID must be a string.");
          }
          if (!connectivities) {
            errors.push("Product model connectivities are required.");
          } else if (!isArrayOfStrings(connectivities) || !connectivities) {
            errors.push(
              "Product model connectivities must be a non-empty array of strings."
            );
          }
          if (batteryLifeMah === undefined || batteryLifeMah === null) {
            errors.push("Product model battery life is required.");
          } else if (
            typeof batteryLifeMah !== "number" ||
            batteryLifeMah <= 0
          ) {
            errors.push(
              "Product model battery life must be a positive number."
            );
          }
          if (
            waterResistanceValue === undefined ||
            waterResistanceValue === null
          ) {
            errors.push("Product model water resistance value is required.");
          } else if (
            typeof waterResistanceValue !== "number" ||
            waterResistanceValue < 0
          ) {
            errors.push(
              "Product model water resistance value must be a non-negative number."
            );
          }
          if (!waterResistanceUnit) {
            errors.push("Product model water resistance unit is required.");
          } else if (
            typeof waterResistanceUnit !== "string" ||
            !waterResistanceUnit
          ) {
            errors.push(
              "Product model water resistance unit must be a non-empty string."
            );
          }
          if (!sensors) {
            errors.push("Product model sensors is required.");
          } else if (!isArrayOfStrings(sensors) || !sensors) {
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
          if (weightMg === undefined || weightMg === null) {
            errors.push("Product model weight is required.");
          } else if (typeof weightMg !== "number" || weightMg <= 0) {
            errors.push("Product model weight must be a positive number.");
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
            basePriceCents,
            imageUrls,
            displaySizeMm,
            displayType,
            resolutionHPx,
            resolutionWPx,
            ramBytes,
            romBytes,
            osId,
            connectivities,
            batteryLifeMah,
            waterResistanceValue,
            waterResistanceUnit,
            sensors,
            caseMaterial,
            weightMg,
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
            basePriceCents !== undefined &&
            (typeof basePriceCents !== "number" || basePriceCents < 0)
          ) {
            errors.push(
              "Product model base price must be a non-negative number."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model image URLs must be an array of valid image URLs."
            );
          }
          if (
            displaySizeMm !== undefined &&
            (typeof displaySizeMm !== "number" || displaySizeMm <= 0)
          ) {
            errors.push(
              "Product model display size must be a positive number."
            );
          }
          if (
            displayType !== undefined &&
            (typeof displayType !== "string" || !displayType)
          ) {
            errors.push(
              "Product model display type must be a non-empty string."
            );
          }
          if (
            resolutionHPx !== undefined &&
            (typeof resolutionHPx !== "number" || resolutionHPx <= 0)
          ) {
            errors.push(
              "Product model resolution H must be a positive number."
            );
          }
          if (
            resolutionWPx !== undefined &&
            (typeof resolutionWPx !== "number" || resolutionWPx <= 0)
          ) {
            errors.push(
              "Product model resolution W must be a positive number."
            );
          }
          if (
            ramBytes !== undefined &&
            (typeof ramBytes !== "number" || ramBytes < 0)
          ) {
            errors.push("Product model RAM must be a non-negative number.");
          }
          if (
            romBytes !== undefined &&
            (typeof romBytes !== "number" || romBytes < 0)
          ) {
            errors.push("Product model ROM must be a non-negative number.");
          }
          if (osId !== undefined && typeof osId !== "string") {
            errors.push("Product model OS ID must be a string.");
          }
          if (
            connectivities !== undefined &&
            (!isArrayOfStrings(connectivities) || !connectivities)
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
            waterResistanceValue !== undefined &&
            (typeof waterResistanceValue !== "number" ||
              waterResistanceValue < 0)
          ) {
            errors.push(
              "Product model water resistance value must be a non-negative number."
            );
          }
          if (
            waterResistanceUnit !== undefined &&
            (typeof waterResistanceUnit !== "string" || !waterResistanceUnit)
          ) {
            errors.push(
              "Product model water resistance unit must be a non-empty string."
            );
          }
          if (
            sensors !== undefined &&
            (!isArrayOfStrings(sensors) || !sensors)
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
  type: "create" | "update",
  variation: "color" | "band"
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
            stopSelling, // Optional

            // For type = color
            additionalPriceCents, // Optional

            // For type = band
            material,
            sizeMm,
            weightMg,
            priceCents,
            basePriceCents,
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
          } else if (!isValidHexColor(colorHex)) {
            errors.push(
              "Product model variation color hex must be a valid hex color."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model variation image URLs must be an array of valid image URLs."
            );
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push(
              "Product model variation stopSelling must be a boolean."
            );
          }
          if (variation === "color") {
            if (
              additionalPriceCents !== undefined &&
              (typeof additionalPriceCents !== "number" ||
                additionalPriceCents < 0)
            ) {
              errors.push(
                "Product model variation additional price must be a non-negative number."
              );
            }
          } else if (variation === "band") {
            if (!material) {
              errors.push("Product model variation material is required.");
            } else if (typeof material !== "string" || !material) {
              errors.push(
                "Product model variation material must be a non-empty string."
              );
            }
            if (sizeMm === undefined || sizeMm === null) {
              errors.push("Product model variation size is required.");
            } else if (typeof sizeMm !== "number" || sizeMm <= 0) {
              errors.push(
                "Product model variation size must be a positive number."
              );
            }
            if (weightMg === undefined || weightMg === null) {
              errors.push("Product model variation weight is required.");
            } else if (typeof weightMg !== "number" || weightMg <= 0) {
              errors.push(
                "Product model variation weight must be a positive number."
              );
            }
            if (priceCents === undefined || priceCents === null) {
              errors.push("Product model variation price is required.");
            } else if (typeof priceCents !== "number" || priceCents < 0) {
              errors.push(
                "Product model variation price must be a non-negative number."
              );
            }
            if (basePriceCents === undefined || basePriceCents === null) {
              errors.push("Product model variation base price is required.");
            } else if (
              typeof basePriceCents !== "number" ||
              basePriceCents < 0
            ) {
              errors.push(
                "Product model variation base price must be a non-negative number."
              );
            }
          }
          break;
        }
        case "update": {
          const {
            name,
            colorHex,
            imageUrls, // Optional
            stopSelling, // Optional

            // For type = color
            additionalPriceCents, // Optional

            // For type = band
            material,
            sizeMm,
            weightMg,
            priceCents,
            basePriceCents,
          } = req.body;

          if (name !== undefined && !isValidProductName(name)) {
            errors.push(
              `Product model variation name must be between
              ${PRODUCT_NAME_MIN_LENGTH} and ${PRODUCT_NAME_MAX_LENGTH} characters long,
              and cannot contain special characters.`
            );
          }
          if (colorHex !== undefined && !isValidHexColor(colorHex)) {
            errors.push(
              "Product model variation color hex must be a valid hex color."
            );
          }
          if (imageUrls !== undefined && !(await isValidImgUrls(imageUrls))) {
            errors.push(
              "Product model variation image URLs must be an array of valid image URLs."
            );
          }
          if (stopSelling !== undefined && typeof stopSelling !== "boolean") {
            errors.push(
              "Product model variation stopSelling must be a boolean."
            );
          }
          if (variation === "color") {
            if (
              additionalPriceCents !== undefined &&
              (typeof additionalPriceCents !== "number" ||
                additionalPriceCents < 0)
            ) {
              errors.push(
                "Product model variation additional price must be a non-negative number."
              );
            }
          } else if (variation === "band") {
            if (material !== undefined && typeof material !== "string") {
              errors.push("Product model variation material must be a string.");
            }
            if (sizeMm !== undefined && typeof sizeMm !== "number") {
              errors.push("Product model variation size must be a number.");
            } else if (sizeMm && sizeMm <= 0) {
              errors.push(
                "Product model variation size must be a positive number."
              );
            }
            if (weightMg !== undefined && typeof weightMg !== "number") {
              errors.push("Product model variation weight must be a number.");
            } else if (weightMg && weightMg <= 0) {
              errors.push(
                "Product model variation weight must be a positive number."
              );
            }
            if (priceCents !== undefined && typeof priceCents !== "number") {
              errors.push("Product model variation price must be a number.");
            } else if (priceCents && priceCents < 0) {
              errors.push(
                "Product model variation price must be a non-negative number."
              );
            }
            if (
              basePriceCents !== undefined &&
              typeof basePriceCents !== "number"
            ) {
              errors.push(
                "Product model variation base price must be a number."
              );
            } else if (basePriceCents && basePriceCents < 0) {
              errors.push(
                "Product model variation base price must be a non-negative number."
              );
            }
            break;
          }
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
