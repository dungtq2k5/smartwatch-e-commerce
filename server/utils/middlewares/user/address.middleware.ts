import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidVnPhoneNumber,
  removeAllSpaces,
  isValidCoordinates,
  isNoneArrObj,
} from "../../../../common/utils.common";
import { HttpError } from "../../errorHandler";

export function sanitizeAddressInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing address input...");
  const {
    name,
    street,
    apartmentNumber,
    wardCode,
    districtCode,
    cityProvinceCode,
  } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof street === "string") {
    req.body.street = removeOddSpaces(street);
  }
  if (typeof apartmentNumber === "string") {
    req.body.apartmentNumber = removeOddSpaces(apartmentNumber);
  }
  if (typeof wardCode === "string") {
    req.body.wardCode = removeAllSpaces(wardCode);
  }
  if (typeof districtCode === "string") {
    req.body.districtCode = removeAllSpaces(districtCode);
  }
  if (typeof cityProvinceCode === "string") {
    req.body.cityProvinceCode = removeAllSpaces(cityProvinceCode);
  }

  next();
}

export function verifyAddressInput(
  type: "create" | "update"
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    console.log("▶️ ", "Validating address input...");

    const errors: string[] = [];
    try {
      switch (type) {
        // Validations of address code will be handled in controller
        case "create": {
          console.log("Validating create address input...");
          const {
            name,
            street,
            apartmentNumber,
            wardCode,
            districtCode,
            cityProvinceCode,
            location,
            phoneNumber,
            isDefault,
          } = req.body;

          if (typeof name !== "string" || !name) {
            errors.push("name is required.");
          }
          if (typeof street !== "string" || !street) {
            errors.push("street is required.");
          }
          if (typeof apartmentNumber !== "string" || !apartmentNumber) {
            errors.push("apartmentNumber is required.");
          }
          if (typeof wardCode !== "string" || !wardCode) {
            errors.push("wardCode is required.");
          }
          if (typeof districtCode !== "string" || !districtCode) {
            errors.push("districtCode is required.");
          }
          if (typeof cityProvinceCode !== "string" || !cityProvinceCode) {
            errors.push("cityProvinceCode is required.");
          }
          if (!location) {
            errors.push("location is required.");
          } else if (
            !isNoneArrObj(location) ||
            location.longitude === undefined ||
            location.latitude === undefined
          ) {
            errors.push(
              "location must be an object with latitude and longitude."
            );
          } else if (
            typeof location.longitude !== "number" ||
            typeof location.latitude !== "number"
          ) {
            errors.push("location latitude and longitude must be numbers.");
          } else if (
            !isValidCoordinates({
              longitude: location.longitude,
              latitude: location.latitude,
            })
          ) {
            errors.push("location latitude and longitude are out of bounds.");
          }
          if (!phoneNumber) {
            errors.push("phoneNumber is required.");
          } else if (!isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
          if (isDefault !== undefined && typeof isDefault !== "boolean") {
            errors.push("isDefault must be a boolean.");
          }
          break;
        }
        case "update": {
          console.log("Validating update address input...");
          const {
            name,
            street,
            apartmentNumber,
            wardCode,
            districtCode,
            cityProvinceCode,
            location,
            phoneNumber,
            isDefault,
          } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a string.");
          }
          if (street !== undefined && (typeof street !== "string" || !street)) {
            errors.push("street must be a string.");
          }
          if (
            apartmentNumber !== undefined &&
            (typeof apartmentNumber !== "string" || !apartmentNumber)
          ) {
            errors.push("apartmentNumber must be a string.");
          }
          if (
            wardCode !== undefined &&
            (typeof wardCode !== "string" || !wardCode)
          ) {
            errors.push("wardCode must be a non-empty string.");
          }
          if (
            districtCode !== undefined &&
            (typeof districtCode !== "string" || !districtCode)
          ) {
            errors.push("districtCode must be a non-empty string.");
          }
          if (
            cityProvinceCode !== undefined &&
            (typeof cityProvinceCode !== "string" || !cityProvinceCode)
          ) {
            errors.push("cityProvinceCode must be a non-empty string.");
          }
          if (location !== undefined) {
            if (
              !isNoneArrObj(location) ||
              !location.longitude ||
              !location.latitude
            ) {
              errors.push(
                "location must be an object with latitude and longitude."
              );
            } else if (
              typeof location.longitude !== "number" ||
              typeof location.latitude !== "number"
            ) {
              errors.push("location latitude and longitude must be numbers.");
            } else if (
              !isValidCoordinates({
                longitude: location.longitude,
                latitude: location.latitude,
              })
            ) {
              errors.push("location latitude and longitude are out of bounds.");
            }
          }
          if (phoneNumber !== undefined && !isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
          if (isDefault !== undefined && typeof isDefault !== "boolean") {
            errors.push("isDefault must be a boolean.");
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
