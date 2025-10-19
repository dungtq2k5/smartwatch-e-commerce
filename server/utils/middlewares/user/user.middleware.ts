import { Request, Response, NextFunction } from "express";
import {
  removeOddSpaces,
  isValidUserFullName,
  isValidEmail,
  isValidPassword,
  isValidVnPhoneNumber,
  removeAllSpaces,
  isValidDateTimeString,
} from "../../../../common/utils.common";
import { isPresent, isValidIdArray, isValidImgUrl } from "../../utils";
import {
  PASSWORD_HINT_MESSAGE,
  USER_GENDER_OPTIONS,
} from "../../../../common/configs.common";
import { HttpError } from "../../errorHandler";

export function sanitizeUserInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log("▶️ ", "Sanitizing user input...");
  const { fullName, email, gender, type, code, value, roleIds } = req.body;
  const { token } = req.params; // For reset password

  if (typeof fullName === "string") {
    req.body.fullName = removeOddSpaces(fullName);
  }
  if (typeof email === "string") {
    req.body.email = removeAllSpaces(email).toLowerCase();
  }
  if (typeof gender === "string") {
    req.body.gender = removeOddSpaces(gender).toLowerCase();
  }
  if (typeof type === "string") {
    req.body.type = removeOddSpaces(type);
  }
  if (typeof code === "string") {
    req.body.code = removeOddSpaces(code);
  }
  if (typeof token === "string") {
    req.body.token = removeOddSpaces(token);
  }
  if (typeof value === "string") {
    req.body.value = removeOddSpaces(value).toLocaleLowerCase();
  }
  if (roleIds !== undefined && Array.isArray(roleIds)) {
    req.body.roleIds = [...new Set(roleIds)]; // Remove duplicates
  }

  next();
}

export function verifyUserInput(
  type:
    | "signup"
    | "login"
    | "update"
    | "auth by google"
    | "verify user"
    | "forgot password"
    | "reset password"
    | "update email"
    | "update phone number"
    | "update contact info"
    | "create"
    | "validate password"
    | "update password"
    | "set password"
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log("▶️ ", "Validating user input...");

    let errors: string[] = [];
    try {
      switch (type) {
        case "signup": {
          console.log("Validating registration input...");
          const { fullName, email, birth, gender, phoneNumber, password } =
            req.body;

          if (!fullName) {
            errors.push("fullName is required.");
          } else if (!isValidUserFullName(fullName)) {
            errors.push("fullName is invalid.");
          }
          if (!email && !phoneNumber) {
            errors.push("email or phoneNumber is required.");
          } else {
            if (email && !isValidEmail(email)) {
              errors.push("email is invalid.");
            }
            if (phoneNumber && !isValidVnPhoneNumber(phoneNumber)) {
              errors.push("phoneNumber is invalid.");
            }
          }
          if (!birth) {
            errors.push("birth is required.");
          } else if (!isValidDateTimeString(birth)) {
            errors.push("birth is invalid.");
          }
          if (!gender) {
            errors.push("gender is required.");
          } else if (!USER_GENDER_OPTIONS.includes(gender)) {
            errors.push(
              "gender is invalid. Must be one of: " +
                USER_GENDER_OPTIONS.join(", ")
            );
          }
          if (!password) {
            errors.push("password is required.");
          } else if (!isValidPassword(password)) {
            errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
          }
          break;
        }
        case "login": {
          console.log("Validating login input...");
          const { email, phoneNumber, password } = req.body;

          if (!email && !phoneNumber) {
            errors.push("email or phoneNumber is required.");
          } else {
            if (email && !isValidEmail(email)) {
              errors.push("email is invalid.");
            }
            if (phoneNumber && !isValidVnPhoneNumber(phoneNumber)) {
              errors.push("phoneNumber is invalid.");
            }
          }
          if (!password) {
            errors.push("password is required.");
          } else if (!isValidPassword(password)) {
            errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
          }
          break;
        }
        case "update": {
          console.log("Validating update input...");
          const {
            fullName,
            avatarUrl,
            password,
            birth,
            gender,
            userBalanceCents,
            isLocked,
            roleIds,
          } = req.body;

          if (fullName !== undefined && !isValidUserFullName(fullName)) {
            errors.push("fullName is invalid.");
          }
          if (password !== undefined && !isValidPassword(password)) {
            errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
          }
          if (birth !== undefined && !isValidDateTimeString(birth)) {
            errors.push("birth is invalid.");
          }
          if (gender !== undefined && !USER_GENDER_OPTIONS.includes(gender)) {
            errors.push(
              `gender is invalid. Must be one of: ${USER_GENDER_OPTIONS.join(
                ", "
              )}`
            );
          }
          if (
            isPresent(avatarUrl) &&
            !(await isValidImgUrl(avatarUrl, "avatar"))
          ) {
            errors.push("avatarUrl is invalid.");
          }
          if (
            userBalanceCents !== undefined &&
            (typeof userBalanceCents !== "number" || userBalanceCents < 0)
          ) {
            errors.push("userBalanceCents must be a non-negative number.");
          }
          if (isLocked !== undefined && typeof isLocked !== "boolean") {
            errors.push("isLocked must be a boolean.");
          }
          if (isPresent(roleIds) && !isValidIdArray(roleIds)) {
            errors.push("roleIds must be an array of valid ids.");
          }
          break;
        }
        case "auth by google": {
          console.log("Validating authentication by Google input...");
          const { idToken, accessToken } = req.body;

          if (!idToken) {
            errors.push("idToken is required.");
          } else if (typeof idToken !== "string") {
            errors.push("idToken must be a non-empty string.");
          }
          if (!accessToken) {
            errors.push("accessToken is required.");
          } else if (typeof accessToken !== "string") {
            errors.push("accessToken must be a non-empty string.");
          }
          break;
        }
        case "verify user": {
          console.log("Validating verify user input...");
          const { type, code } = req.body;

          if (!type) {
            errors.push("type is required.");
          } else if (type !== "email" && type !== "phoneNumber") {
            errors.push("type must be either 'email' or 'phoneNumber'.");
          }
          if (!code) {
            errors.push("code is required.");
          } else if (typeof code !== "string") {
            errors.push("code must be a non-empty string.");
          }
          break;
        }
        case "forgot password": {
          console.log("Validating forgot password input...");
          const { email, phoneNumber } = req.body;

          if (!email && !phoneNumber) {
            errors.push("email or phoneNumber is required.");
          } else {
            if (email && !isValidEmail(email)) {
              errors.push("email is invalid.");
            }
            if (phoneNumber && !isValidVnPhoneNumber(phoneNumber)) {
              errors.push("phoneNumber is invalid.");
            }
          }
          break;
        }
        case "reset password": {
          console.log("Validating reset password input...");
          const token = req.params.token;
          const password = req.body.password;

          if (!token) {
            errors.push("token is required.");
          } else if (typeof token !== "string") {
            errors.push("token must be a non-empty string.");
          }
          if (!password) {
            errors.push("password is required.");
          } else if (!isValidPassword(password)) {
            errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
          }
          break;
        }
        case "update email": {
          console.log("Validating update email input...");
          const { email, isEmailVerified } = req.body;

          if (email !== undefined && !isValidEmail(email)) {
            errors.push("email is invalid.");
          }
          if (
            isEmailVerified !== undefined &&
            typeof isEmailVerified !== "boolean"
          ) {
            errors.push("isEmailVerified must be a boolean.");
          }
          break;
        }
        case "update phone number": {
          console.log("Validating update phone number input...");
          const { phoneNumber, isPhoneNumberVerified } = req.body;
          if (phoneNumber !== undefined && !isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
          if (
            isPhoneNumberVerified !== undefined &&
            typeof isPhoneNumberVerified !== "boolean"
          ) {
            errors.push("isPhoneNumberVerified must be a boolean.");
          }
          break;
        }
        case "update contact info": {
          console.log("Validating update contact info input...");
          const { type, value } = req.body;

          if (!type) {
            errors.push("type is required.");
          } else if (type !== "email" && type !== "phoneNumber") {
            errors.push("type must be either 'email' or 'phoneNumber'.");
          } else if (!value) {
            errors.push("value is required.");
          } else if (type === "email" && !isValidEmail(value)) {
            errors.push("value must be a valid email.");
          } else if (type === "phoneNumber" && !isValidVnPhoneNumber(value)) {
            errors.push("value must be a valid phone number.");
          }
          break;
        }
        case "create": {
          console.log("Validating create input...");
          const {
            fullName,
            avatarUrl,
            email,
            isEmailVerified,
            phoneNumber,
            isPhoneNumberVerified,
            password,
            birth,
            gender,
            userBalanceCents,
            isLocked,
            roleIds,
          } = req.body;

          if (!fullName) {
            errors.push("fullName is required.");
          } else if (!isValidUserFullName(fullName)) {
            errors.push("fullName is invalid.");
          }
          if (
            isPresent(avatarUrl) &&
            !(await isValidImgUrl(avatarUrl, "avatar"))
          ) {
            errors.push("avatarUrl is invalid.");
          }
          if (!email && !phoneNumber) {
            errors.push("email or phoneNumber is required.");
          }
          if (email && !isValidEmail(email)) {
            errors.push("email is invalid.");
          }
          if (
            isEmailVerified !== undefined &&
            typeof isEmailVerified !== "boolean"
          ) {
            errors.push("isEmailVerified must be a boolean.");
          }
          if (phoneNumber && !isValidVnPhoneNumber(phoneNumber)) {
            errors.push("phoneNumber is invalid.");
          }
          if (
            isPhoneNumberVerified !== undefined &&
            typeof isPhoneNumberVerified !== "boolean"
          ) {
            errors.push("isPhoneNumberVerified must be a boolean.");
          }
          if (!password) {
            errors.push("password is required.");
          } else if (!isValidPassword(password)) {
            errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
          }
          if (!birth) {
            errors.push("birth is required.");
          } else if (!isValidDateTimeString(birth)) {
            errors.push("birth is invalid.");
          }
          if (!gender) {
            errors.push("gender is required.");
          } else if (!USER_GENDER_OPTIONS.includes(gender)) {
            errors.push(
              "gender is invalid. Must be one of: " +
                USER_GENDER_OPTIONS.join(", ")
            );
          }
          if (
            userBalanceCents !== undefined &&
            (typeof userBalanceCents !== "number" || userBalanceCents < 0)
          ) {
            errors.push("userBalanceCents must be a non-negative number.");
          }
          if (isLocked !== undefined && typeof isLocked !== "boolean") {
            errors.push("isLocked must be a boolean.");
          }
          if (isPresent(roleIds) && !isValidIdArray(roleIds)) {
            errors.push("roleIds must be an array of valid ids.");
          }
          break;
        }
        case "validate password":
        case "set password": {
          console.log("Validating validate password input...");
          const { password } = req.body;

          if (!password) {
            errors.push("password is required.");
          } else if (!isValidPassword(password)) {
            errors.push("password is invalid.");
          }
          break;
        }
        case "update password": {
          console.log("Validating update password input...");
          const { currentPassword, newPassword } = req.body;

          if (!currentPassword) {
            errors.push("currentPassword is required.");
          } else if (!isValidPassword(currentPassword)) {
            errors.push("currentPassword is invalid.");
          }
          if (!newPassword) {
            errors.push("newPassword is required.");
          } else if (!isValidPassword(newPassword)) {
            errors.push(`password is invalid (${PASSWORD_HINT_MESSAGE}).`);
          }
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
