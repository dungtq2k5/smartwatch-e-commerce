import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidUserFullName,
  isValidEmail,
  isValidPassword,
  isValidVnPhoneNumber,
} from "../../../common/utils.common";
import { isValidImgUrl } from "..//utils";
import { PASSWORD_HINT_MESSAGE } from "../../../common/configs.common";
import { errorHandler } from "../errorHandler";

export function sanitizeUserInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️", "Sanitizing user input...");
  const { fullName, email, type, code } = req.body;
  const { token } = req.params; // For reset password case

  if (typeof fullName === "string") {
    req.body.fullName = removeOddSpaces(fullName);
  }
  if (typeof email === "string") {
    req.body.email = removeOddSpaces(email).toLowerCase();
  }
  if (typeof type === "string") {
    req.body.type = removeOddSpaces(type).toLowerCase();
  }
  if (typeof code === "string") {
    req.body.code = removeOddSpaces(code);
  }
  if (typeof token === "string") {
    req.body.token = removeOddSpaces(token);
  }

  next();
}

export async function verifyUserInput(
  req: Request,
  res: Response,
  next: NextFunction,
  type:
    | "signup"
    | "login"
    | "update"
    | "auth by google"
    | "verify user"
    | "forgot password"
    | "reset password"
): Promise<void> {
  console.log("▶️", "Validating user input...");

  let errors: string[] = [];
  try {
    switch (type) {
      case "signup": {
        console.log("Validating registration input...");
        const { fullName, email, phoneNumber, password } = req.body;

        if (fullName === undefined) {
          errors.push("fullName is required.");
        } else if (!isValidUserFullName(fullName)) {
          errors.push("fullName is invalid.");
        }
        if (email === undefined && phoneNumber === undefined) {
          errors.push("email or phoneNumber is required.");
        } else {
          if (email !== undefined && !isValidEmail(email)) {
            errors.push("email is invalid.");
          }
          if (phoneNumber !== undefined && !isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
        }
        if (password === undefined) {
          errors.push("password is required.");
        } else if (!isValidPassword(password)) {
          errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
        }
        break;
      }
      case "login": {
        console.log("Validating login input...");
        const { email, phoneNumber, password } = req.body;

        if (email === undefined && phoneNumber === undefined) {
          errors.push("email or phoneNumber is required.");
        } else {
          if (email !== undefined && !isValidEmail(email)) {
            errors.push("email is invalid.");
          }
          if (phoneNumber !== undefined && !isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
        }
        if (password === undefined) {
          errors.push("password is required.");
        } else if (!isValidPassword(password)) {
          errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
        }
        break;
      }
      case "update": {
        console.log("Validating update input...");
        const { fullName, email, phoneNumber, password, avatarUrl } = req.body;

        if (fullName !== undefined && !isValidUserFullName(fullName)) {
          errors.push("fullName is invalid.");
        }
        if (email !== undefined && !isValidEmail(email)) {
          errors.push("email is invalid.");
        }
        if (phoneNumber !== undefined && !isValidVnPhoneNumber(phoneNumber)) {
          errors.push("phoneNumber is invalid.");
        }
        if (password !== undefined && !isValidPassword(password)) {
          errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
        }
        if (
          avatarUrl !== undefined &&
          avatarUrl !== null &&
          !(await isValidImgUrl(avatarUrl))
        ) {
          errors.push("avatarUrl is invalid.");
        }
        break;
      }
      case "auth by google": {
        console.log("Validating authentication by Google input...");
        const { fullName, email, avatarUrl } = req.body;

        if (fullName === undefined) {
          errors.push("fullName is required.");
        } else if (!isValidUserFullName(fullName)) {
          errors.push("fullName is invalid.");
        }
        if (email === undefined) {
          errors.push("email is required.");
        } else if (!isValidEmail(email)) {
          errors.push("email is invalid.");
        }
        if (
          avatarUrl !== undefined &&
          avatarUrl !== null &&
          !(await isValidImgUrl(avatarUrl))
        ) {
          errors.push("avatarUrl is invalid.");
        }
        break;
      }
      case "verify user": {
        console.log("Validating verify user input...");
        const { type, code } = req.body;

        if (type === undefined) {
          errors.push("type is required.");
        } else if (type !== "email" && type !== "phone") {
          errors.push("type must be either 'email' or 'phone'.");
        }
        if (code === undefined) {
          errors.push("code is required.");
        } else if (typeof code !== "string") {
          errors.push("code must be a non-empty string.");
        }
        break;
      }
      case "forgot password": {
        console.log("Validating forgot password input...");
        const { email, phoneNumber } = req.body;

        if (email === undefined && phoneNumber === undefined) {
          errors.push("email or phoneNumber is required.");
        } else {
          if (email !== undefined && !isValidEmail(email)) {
            errors.push("email is invalid.");
          }
          if (phoneNumber !== undefined && !isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
        }
        break;
      }
      case "reset password": {
        console.log("Validating reset password input...");
        const token = req.params.token;
        const password = req.body.password;

        if (token === undefined) {
          errors.push("token is required.");
        } else if (typeof token !== "string") {
          errors.push("token must be a non-empty string.");
        }
        if (password === undefined) {
          errors.push("password is required.");
        } else if (!isValidPassword(password)) {
          errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
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
}
