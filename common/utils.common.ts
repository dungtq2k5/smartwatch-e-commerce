import type { UserAddressFormat } from "../client/src/utils/types.ts";
import {
  BUYER_RETURN_REASON_MAX_LENGTH,
  BUYER_RETURN_REASON_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "./configs.common.ts";
import type { DeepPartial, UserAddressCompare } from "./types.common.ts";
import { districts, wards, provinces } from "./vnAddresses.ts";

export function removeOddSpaces(val: string): string {
  return val.replace(/\s+/g, " ").trim();
}

export function removeAllSpaces(val: string): string {
  return val.replace(/\s/g, "");
}

export function genRandomPassword(): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const allChars = letters + numbers;

  const passwordChars: string[] = [];

  // Ensure at least one letter
  passwordChars.push(letters[Math.floor(Math.random() * letters.length)]);

  // Ensure at least one number
  passwordChars.push(numbers[Math.floor(Math.random() * numbers.length)]);

  // Fill the rest of the password length with random characters from the combined set
  for (let i = 2; i < PASSWORD_MIN_LENGTH; i++) {
    passwordChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle the array to ensure randomness of character positions
  // Fisher-Yates shuffle algorithm
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]]; // Swap elements
  }

  return passwordChars.join("");
}

export function genRandomString(length: number = 5): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const allChars = letters + numbers;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  return result;
}

export function convertVnPhoneNumberToE164(phoneNumber: string): string {
  // Convert Vietnamese phone number to E.164 format
  // E.164 format for Vietnam is +84 followed by the phone number without the leading 0
  if (!isValidVnPhoneNumber(phoneNumber)) {
    throw new Error("Invalid Vietnamese phone number");
  }

  return `+84${phoneNumber.slice(1)}`; // Remove leading 0 and add +84
}

// Return string format: YYYY-MM-DD at local timezone
export function getLocalDateString(utcIsoString: string): string {
  // Create a Date object from the UTC ISO string.
  const date = new Date(utcIsoString);

  // Use the local-based methods to get the year, month, and day.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // Return the date in YYYY-MM-DD format.
  return `${year}-${month}-${day}`;
}

export function readFileAsDataUrl(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => resolve(event.target!.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function capFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capEveryFirstLetter(str: string): string {
  if (!str) return str;
  return str
    .split(" ")
    .map((word) => capFirstLetter(word))
    .join(" ");
}

export function centsToUSD(cents: number, locale: string = "en-US"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export function randNum(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Checks if an item is a non-array object (since null or array is also an object).
 * @param item - The item to check.
 * @returns True if the item is a non-array object, false otherwise.
 */
export const isNoneArrObj = (item: any): item is Record<string, any> => {
  return (
    item && typeof item === "object" && item !== null && !Array.isArray(item)
  );
};

/**
 * Recursively removes keys from an object that have `undefined` values or are empty objects.
 * Keys with `null` values are kept.
 * @param obj The object to clean.
 * @returns The cleaned object.
 */
export function cleanObj<T extends object>(obj: T): T {
  const newObj = { ...obj };

  for (const key in newObj) {
    if (Object.hasOwn(newObj, key)) {
      const value = newObj[key as keyof T];

      if (isNoneArrObj(value)) {
        // Recursively clean nested objects
        const cleanedValue = cleanObj(value);
        // If the nested object is empty after cleaning, remove it
        if (Object.keys(cleanedValue).length === 0) {
          delete newObj[key as keyof T];
        } else {
          newObj[key as keyof T] = cleanedValue as T[keyof T];
        }
      } else if (value === undefined) {
        // Remove keys with undefined values
        delete newObj[key as keyof T];
      }
    }
  }
  return newObj;
}

/**
 * Deeply merges two objects, giving precedence to defined properties in the source object.
 * Undefined properties in the source object are ignored. After merging, it recursively
 * removes any keys that have `undefined` values or are empty objects.
 *
 * @param target - The original object to merge into.
 * @param source - The object containing updated properties.
 * @returns A new object with deeply merged and cleaned properties.
 */
export function deepMerge<T extends object>(
  target: T,
  source?: DeepPartial<T>
): T {
  if (!source) return target;

  const output = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key as keyof T];
      const targetValue = output[key as keyof T];

      if (sourceValue === undefined) {
        continue; // Skip undefined properties in the source
      }

      // If both the target and source values are objects, recursively merge them
      if (isNoneArrObj(targetValue) && isNoneArrObj(sourceValue)) {
        output[key as keyof T] = deepMerge(targetValue, sourceValue);
      }
      // Otherwise, assign the value from the source
      else {
        output[key as keyof T] = sourceValue as T[keyof T];
      }
    }
  }

  return cleanObj(output);
}

/**
 * Merges the properties of a source object into a target object at a shallow level.
 * It ignores properties with `undefined` values in the source object.
 * Unlike `deepMerge`, it does not recursively merge nested objects; it replaces them.
 *
 * @param target - The original object to merge into.
 * @param source - The object containing updated properties.
 * @returns A new object with shallowly merged properties.
 */
export function shallowMerge<T extends object>(
  target: T,
  source?: Partial<T>
): T {
  if (!source) return target;

  const output = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key as keyof T];

      if (sourceValue !== undefined) {
        output[key as keyof T] = sourceValue as T[keyof T];
      }
    }
  }

  return output;
}

export function bytesToMB(bytes: number): string {
  if (bytes < 0) {
    throw new Error("Bytes cannot be negative");
  }
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(2); // Return as a string with 2 decimal places
}

export function formatTime(min: number | null): string {
  if (min === null || min < 0) return "N/A";
  if (min < 60) return `${min} min`;

  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  return `${hours}h ${minutes}min`;
}

export function safeString(value: string | null | undefined): string {
  return value || "N/A";
}

export function isEmptyObj(obj: any): boolean {
  if (typeof obj !== "object" || obj === null) return true;

  // Check if the object has no own properties
  return Object.keys(obj).length === 0;
}

export function formatError(
  err: unknown,
  exceptionMsg: string = "An unknown error occurred"
): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;

  return String(err) || exceptionMsg;
}

export function compareUserAddress(
  address1: UserAddressCompare,
  address2: UserAddressCompare
): boolean {
  return (
    address1.name === address2.name &&
    address1.street === address2.street &&
    address1.apartmentNumber === address2.apartmentNumber &&
    address1.wardCode === address2.wardCode &&
    address1.districtCode === address2.districtCode &&
    address1.cityProvinceCode === address2.cityProvinceCode &&
    address1.countryCode === address2.countryCode &&
    address1.location.coordinates[0] === address2.location.coordinates[0] && // long
    address1.location.coordinates[1] === address2.location.coordinates[1] && // lat
    address1.phoneNumber === address2.phoneNumber
  );
}

// --- VALIDATION UTILS ---
export function isValidUserFullName(fullName: any): boolean {
  if (typeof fullName !== "string") return false;

  if (containsEmoji(fullName)) return false;

  if (
    fullName.length < USERNAME_MIN_LENGTH ||
    fullName.length > USERNAME_MAX_LENGTH
  )
    return false;

  // Regex to allow Unicode letters and spaces,
  // and ensure at least one non-whitespace character.
  // \p{L} matches any kind of letter from any language.
  // The 'u' flag is necessary for Unicode property escapes.
  const fullNameRegex = /^(?=.*\S)[\p{L}\s]+$/u;
  return fullNameRegex.test(fullName);
}

export function isValidEmail(email: any): boolean {
  if (typeof email !== "string") return false; // Handle non-string input

  if (containsEmoji(email)) return false;

  const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: any): boolean {
  if (typeof password !== "string") return false;

  if (containsEmoji(password)) return false;

  // Password contains at least a letter + a number + length >= minLength and <= maxLength -> valid
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    /[a-zA-Z]/.test(password) &&
    /\d/.test(password)
  );
}

export function isValidPhoneNumber(phoneNumber: any): boolean {
  if (typeof phoneNumber !== "string") return false;

  // This regex validates phone numbers in the international E.164 format.
  // E.g., +14155552671
  // It checks for a leading '+', followed by digits.
  // The total length of digits is typically between 7 and 15.
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(phoneNumber);
}

export function isValidVnPhoneNumber(phoneNumber: any): boolean {
  if (typeof phoneNumber !== "string") return false;

  // Vietnamese phone numbers start with 0 and are 10 or 11 digits long
  const phoneRegex = /^(0[1-9]\d{8}|0[1-9]\d{9})$/;
  return phoneRegex.test(phoneNumber);
}

export function isValidProductName(productName: any): boolean {
  if (typeof productName !== "string") return false;

  // Product name should be a non-empty string without emojis
  if (containsEmoji(productName)) return false;

  // Product name should not be empty and should not exceed 100 characters
  return (
    productName.length > PRODUCT_NAME_MIN_LENGTH &&
    productName.length <= PRODUCT_NAME_MAX_LENGTH
  );
}

export function isStringArray(arr: any): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;

  // Check if every element in the array is a string
  return arr.every((item) => typeof item === "string");
}

export function isValidDateTimeString(dateTimeString: any): boolean {
  if (typeof dateTimeString !== "string") return false;

  // Check if the string is a valid date-time format
  const date = new Date(dateTimeString);
  return !isNaN(date.getTime());
}

export function isValidColorHex(colorCode: any): boolean {
  if (typeof colorCode !== "string") return false;

  // This regex matches hex color codes of length 3, 4, 6, or 8,
  // preceded by a hash (#).
  // It supports formats like #rgb, #rgba, #rrggbb, and #rrggbbaa.
  const hexColorRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  return hexColorRegex.test(colorCode);
}

export function isValidListOfColorsHex(colors: any): boolean {
  if (!Array.isArray(colors)) return false;

  return colors.every((color) => isValidColorHex(color));
}

export function isValidBuyerReturnReason(reason: any): boolean {
  if (typeof reason !== "string") return false;

  return (
    reason.length > BUYER_RETURN_REASON_MIN_LENGTH &&
    reason.length < BUYER_RETURN_REASON_MAX_LENGTH
  );
}

// List of colors with name and hex
export function isValidListOfColorObj(colors: any): boolean {
  if (!Array.isArray(colors)) return false;

  return colors.every(
    (color) =>
      isValidColorHex(color.hex) &&
      typeof color.name === "string" &&
      !!color.name.trim()
  );
}

export function containsEmoji(text: any): boolean {
  if (typeof text !== "string") return false;

  // This regex uses Unicode property escapes to detect characters
  // that are considered "Extended Pictographic". This is a broad
  // category that includes most characters users would identify as emoji.
  // The 'u' flag is essential for Unicode property escapes to work correctly.
  // This approach is generally more robust to evolving emoji sets than
  // manually listing Unicode ranges, as it relies on the JS engine's
  // built-in knowledge of Unicode character properties.
  const emojiRegex = /\p{Extended_Pictographic}/u;

  return emojiRegex.test(text);
}

export function isValidCoordinates(coords: {
  longitude: number;
  latitude: number;
}): boolean {
  const { longitude, latitude } = coords;
  return (
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
}

export function isValidBirthDate(birthDate: any): boolean {
  if (!(birthDate instanceof Date)) {
    birthDate = new Date(birthDate);
  }

  // Check if the date is valid
  if (isNaN(birthDate.getTime())) return false;

  // Check if the date is in the past
  const today = new Date();
  return birthDate < today;
}

export function isValidNumString(numString: any): boolean {
  if (typeof numString !== "string") return false;

  // Check if the string is a valid number
  const num = Number(numString);
  if (isNaN(num)) return false;

  // Check if the number is finite
  if (!isFinite(num)) return false;

  // Check if the string representation matches the number
  return numString === String(num);
}

// --- ADDRESS UTILS ---
export function formatAddress(address: UserAddressFormat): string {
  const ward = getWard(address.wardCode);
  const district = getDistrict(address.districtCode);
  const cityProvince = getCityProvince(address.cityProvinceCode);

  if (!ward || !district || !cityProvince) {
    throw new Error("Invalid address components");
  }

  return `${address.street}, ${address.apartmentNumber}, ${ward.name_with_type}, ${district.name_with_type}, ${cityProvince.name_with_type}`;
}

export function getWard(wardCode: string) {
  return wards.data.find((ward) => ward.code === wardCode);
}

export function getDistrict(districtCode: string) {
  return districts.data.find((district) => district.code === districtCode);
}

export function getCityProvince(cityProvinceCode: string) {
  return provinces.data.find((province) => province.code === cityProvinceCode);
}

export function isValidAddress(address: {
  wardCode: string;
  districtCode: string;
  cityProvinceCode: string;
}): boolean {
  const { wardCode, districtCode, cityProvinceCode } = address;

  const cityProvince = getCityProvince(cityProvinceCode);
  if (!cityProvince) return false;

  const district = getDistrict(districtCode);
  if (!district || district.parent_code !== cityProvinceCode) return false;

  const ward = getWard(wardCode);
  if (!ward || ward.parent_code !== districtCode) return false;

  return true;
}

export function getDistrictsByProvinceCode(provinceCode: string) {
  const filteredDistricts = districts.data.filter(
    (district) => district.parent_code === provinceCode
  );

  return {
    total: filteredDistricts.length,
    data: filteredDistricts,
  };
}

export function getWardsByDistrictCode(districtCode: string) {
  const filteredWards = wards.data.filter(
    (ward) => ward.parent_code === districtCode
  );

  return {
    total: filteredWards.length,
    data: filteredWards,
  };
}
