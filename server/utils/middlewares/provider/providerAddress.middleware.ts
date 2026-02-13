import { Request, Response, NextFunction } from "express";
import {
  isNoneArrObj,
  isValidCoordinates,
  removeAllSpaces,
  removeOddSpaces,
} from "../../../../common/utils.common";
import { isValidPhoneNumber } from "libphonenumber-js";
import { HttpError } from "../../errorHandler";
import { isPresent } from "../../utils";

export function sanitizeProviderAddressInput(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  console.log("▶️ ", "Sanitizing provider address input...");
  const {
    name,
    addressLine1,
    addressLine2,
    locality,
    adminAreaL1,
    adminAreaL2,
    postalCode,
    phoneNumber,
    notes,
  } = req.body;

  if (typeof name === "string") {
    req.body.name = removeOddSpaces(name);
  }
  if (typeof addressLine1 === "string") {
    req.body.addressLine1 = removeOddSpaces(addressLine1);
  }
  if (typeof addressLine2 === "string") {
    req.body.addressLine2 = removeOddSpaces(addressLine2);
  }
  if (typeof locality === "string") {
    req.body.locality = removeOddSpaces(locality);
  }
  if (typeof adminAreaL1 === "string") {
    req.body.adminAreaL1 = removeOddSpaces(adminAreaL1);
  }
  if (typeof adminAreaL2 === "string") {
    req.body.adminAreaL2 = removeOddSpaces(adminAreaL2);
  }
  if (typeof postalCode === "string") {
    req.body.postalCode = removeAllSpaces(postalCode);
  }
  if (typeof phoneNumber === "string") {
    req.body.phoneNumber = removeOddSpaces(phoneNumber);
  }
  if (typeof notes === "string") {
    req.body.notes = removeOddSpaces(notes);
  }

  next();
}

export function verifyProviderAddressInput(
  type: "create" | "update",
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
            addressLine1,
            addressLine2,
            locality,
            adminAreaL1,
            adminAreaL2,
            postalCode,
            phoneNumber,
            location,
            notes,
            isDefault,
          } = req.body;

          if (typeof name !== "string") {
            errors.push("name is required.");
          } else if (!name) {
            errors.push("name is invalid.");
          }
          if (typeof addressLine1 !== "string") {
            errors.push("addressLine1 is required.");
          } else if (!addressLine1) {
            errors.push("addressLine1 is invalid.");
          }
          if (
            isPresent(addressLine2) &&
            (typeof addressLine2 !== "string" || !addressLine2)
          ) {
            errors.push("addressLine2 must be a non-empty string or null.");
          }
          if (typeof locality !== "string") {
            errors.push("locality is required.");
          } else if (!locality) {
            errors.push("locality is invalid.");
          }
          if (typeof adminAreaL1 !== "string") {
            errors.push("adminAreaL1 is required.");
          } else if (!adminAreaL1) {
            errors.push("adminAreaL1 is invalid.");
          }
          if (
            isPresent(adminAreaL2) &&
            (typeof adminAreaL2 !== "string" || !adminAreaL2)
          ) {
            errors.push("adminAreaL2 must be a non-empty string or null.");
          }
          if (typeof postalCode !== "string") {
            errors.push("postalCode is required.");
          } else if (!postalCode) {
            errors.push("postalCode is invalid.");
          }
          if (!phoneNumber) {
            errors.push("phoneNumber is required.");
          } else if (!isValidPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
          if (!location) {
            errors.push("location is required.");
          } else if (
            !isNoneArrObj(location) ||
            location.latitude === undefined ||
            location.longitude === undefined
          ) {
            errors.push(
              "location must be an object with latitude and longitude.",
            );
          } else if (
            typeof location.latitude !== "number" ||
            typeof location.longitude !== "number"
          ) {
            errors.push("location latitude and longitude must be numbers.");
          } else if (
            !isValidCoordinates({
              latitude: location.latitude,
              longitude: location.longitude,
            })
          ) {
            errors.push("location latitude and longitude are out of bounds.");
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("notes must be a non-empty string or null.");
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
            addressLine1,
            addressLine2,
            locality,
            adminAreaL1,
            adminAreaL2,
            postalCode,
            phoneNumber,
            location,
            notes,
            isDefault,
          } = req.body;

          if (name !== undefined && (typeof name !== "string" || !name)) {
            errors.push("name must be a string.");
          }
          if (
            addressLine1 !== undefined &&
            (typeof addressLine1 !== "string" || !addressLine1)
          ) {
            errors.push("addressLine1 must be a string.");
          }
          if (
            isPresent(addressLine2) &&
            (typeof addressLine2 !== "string" || !addressLine2)
          ) {
            errors.push("addressLine2 must be a non-empty string or null.");
          }
          if (
            locality !== undefined &&
            (typeof locality !== "string" || !locality)
          ) {
            errors.push("locality must be a non-empty string.");
          }
          if (
            adminAreaL1 !== undefined &&
            (typeof adminAreaL1 !== "string" || !adminAreaL1)
          ) {
            errors.push("adminAreaL1 must be a non-empty string.");
          }
          if (
            isPresent(adminAreaL2) &&
            (typeof adminAreaL2 !== "string" || !adminAreaL2)
          ) {
            errors.push("adminAreaL2 must be a non-empty string or null.");
          }
          if (
            postalCode !== undefined &&
            (typeof postalCode !== "string" || !postalCode)
          ) {
            errors.push("postalCode must be a non-empty string.");
          }
          if (phoneNumber !== undefined) {
            if (typeof phoneNumber !== "string" || !phoneNumber) {
              errors.push("phoneNumber must be a non-empty string.");
            } else if (!isValidPhoneNumber(phoneNumber)) {
              errors.push("phoneNumber is invalid.");
            }
          }
          if (location !== undefined) {
            if (
              !isNoneArrObj(location) ||
              !location.latitude ||
              !location.longitude
            ) {
              errors.push(
                "location must be an object with latitude and longitude.",
              );
            } else if (
              typeof location.latitude !== "number" ||
              typeof location.longitude !== "number"
            ) {
              errors.push("location latitude and longitude must be numbers.");
            } else if (
              !isValidCoordinates({
                latitude: location.latitude,
                longitude: location.longitude,
              })
            ) {
              errors.push("location latitude and longitude are out of bounds.");
            }
          }
          if (isPresent(notes) && (typeof notes !== "string" || !notes)) {
            errors.push("notes must be a non-empty string or null.");
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
