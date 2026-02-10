import {
  BUYER_RETURN_REASON_MAX_LENGTH,
  BUYER_RETURN_REASON_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  VN_COUNTRY_CODE,
} from "./configs.common.ts";
import type {
  CountryListEntry,
  DeepPartial,
  UserAddressCompare,
  UserAddressFormat,
} from "./types.common.ts";
import { districts, wards, provinces } from "./vnAddresses.ts";
import parsePhoneNumberFromString, {
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";
import countries from "i18n-iso-countries";

countries.registerLocale(await import("i18n-iso-countries/langs/en.json"));

export function removeOddSpaces(val: string): string {
  return val.replaceAll(/\s+/g, " ").trim();
}

export function removeAllSpaces(val: string): string {
  return val.replaceAll(/\s/g, "");
}

export function genRandomPassword(): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const allChars = letters + numbers;

  const passwordChars: string[] = [];

  // Ensure at least one letter and one number
  passwordChars.push(
    letters[Math.floor(Math.random() * letters.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
  );

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

/**
 * Converts a Date object or an ISO date string into a local date string in "YYYY-MM-DD" format.
 *
 * This function interprets the input date based on the local time zone of the runtime environment.
 * It extracts the local year, month, and day to construct the formatted string.
 *
 * @param date - The date to format, either as a `Date` object or a string (e.g., ISO 8601 format).
 * @returns A string representing the local date in "YYYY-MM-DD" format.
 *
 * @example
 * // Assuming local time zone is UTC-5 (EST)
 * getLocalDateString("2023-10-25T02:00:00Z"); // Returns "2023-10-24" (because 2 AM UTC is 9 PM previous day EST)
 *
 * @example
 * const d = new Date(2023, 0, 15); // Jan 15, 2023
 * getLocalDateString(d); // Returns "2023-01-15"
 */
export function getLocalDateString(date: string | Date): string {
  // Create a Date object from the UTC ISO string.
  if (!(date instanceof Date)) date = new Date(date);

  // Use the local-based methods to get the year, month, and day.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  // Return the date in YYYY-MM-DD format.
  return `${year}-${month}-${day}`;
}

export function readFileAsDataUrl(
  file: File,
): Promise<string | ArrayBuffer | null> {
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
export function isNoneArrObj(item: any): item is Record<string, any> {
  return (
    item && typeof item === "object" && item !== null && !Array.isArray(item)
  );
}

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
  source?: DeepPartial<T>,
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
  source?: Partial<T>,
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

export function formatMinTime(min: number | null): string {
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
  exceptionMsg: string = "An unknown error occurred",
): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;

  let errMsg = String(err) || exceptionMsg;
  if ([".", "!", "?"].includes(errMsg[0])) errMsg += "!";

  return errMsg;
}

export function compareUserAddress(
  address1: UserAddressCompare,
  address2: UserAddressCompare,
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

export function getClosestPreMonday(): Date {
  const today = new Date();
  const daysToMonday = (today.getDay() + 6) % 7;
  today.setDate(today.getDate() - daysToMonday);
  today.setHours(0, 0, 0, 0); // Set to start of the day
  return today;
}

/**
 * Compares two lists to determine if they contain the same elements,
 * regardless of their order.
 *
 * @remarks
 * This function creates sorted copies of the input arrays and compares their
 * string representations. It is best suited for arrays of primitive types
 * (string, number, boolean). It will not perform a deep comparison on objects.
 * Note that the default `.sort()` method is lexicographical and may not sort
 * numbers as expected (e.g., 10 will come before 2).
 *
 * @template T The type of the elements in the lists.
 * @param a The first list to compare.
 * @param b The second list to compare.
 * @returns `true` if the lists contain the same elements, `false` otherwise.
 */
export function compareList<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.toString() === sortedB.toString();
}

/**
 * Deeply compares two values to check if they are equal.
 * Supports primitives, arrays, objects, and Dates.
 */
/**
 * Performs a deep equality check between two values to determine if they are equivalent.
 *
 * This function recursively compares nested objects and arrays. It handles:
 * - Primitive types (`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`) using strict equality (`===`).
 * - `Date` objects by comparing their millisecond timestamps.
 * - Arrays by comparing their lengths and then recursively checking each element in order. The order of elements matters.
 * - Plain objects by comparing their keys and recursively checking the corresponding values.
 *
 * @param a The first value to compare.
 * @param b The second value to compare.
 * @returns `true` if the values are deeply equal, `false` otherwise.
 *
 * @example
 * const obj1 = { a: 1, b: { c: 2 } };
 * const obj2 = { a: 1, b: { c: 2 } };
 * const obj3 = { a: 1, b: { c: 3 } };
 *
 * deepCompare(obj1, obj2); // returns true
 * deepCompare(obj1, obj3); // returns false
 *
 * const arr1 = [1, [2, 3]];
 * const arr2 = [1, [2, 3]];
 * const arr3 = [1, [3, 2]]; // Order matters
 *
 * deepCompare(arr1, arr2); // returns true
 * deepCompare(arr1, arr3); // returns false
 */
export function deepCompare(a: any, b: any): boolean {
  // 1. Strict equality check (covers primitives and same references)
  if (a === b) return true;

  // 2. Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // 3. Check if either is null or undefined (after strict check failed)
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }

  // 4. Check if types are different
  if (typeof a !== typeof b) return false;

  // 5. Handle Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Sort is NOT performed here because order usually matters in UI lists.
    // If order doesn't matter for your specific case, sort before calling this.
    for (let i = 0; i < a.length; i++) {
      if (!deepCompare(a[i], b[i])) return false;
    }
    return true;
  }

  // 6. Handle Objects
  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.hasOwn(b, key)) return false;
      if (!deepCompare(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export function getCountryList(): CountryListEntry[] {
  const obj = countries.getNames("en", { select: "official" });

  return Object.entries(obj)
    .map(([code, name]) => {
      const countryCode = code as CountryCode;
      let dialCode = "";

      try {
        // libphonenumber-js helper
        dialCode = `+${getCountryCallingCode(countryCode)}`;
      } catch {
        // Some ISO codes might not have a dial code in libphonenumber-js
        dialCode = "";
      }

      return {
        code: countryCode,
        name,
        dialCode,
      };
    })
    .filter((country) => country.dialCode !== ""); // Filter out countries with no dial code
}

export function getCountryFromPhoneNumber(
  e164PhoneNumber: string,
): CountryListEntry | undefined {
  const phoneNumber = parsePhoneNumberFromString(e164PhoneNumber);

  if (!phoneNumber || !phoneNumber.country) return;

  return {
    code: phoneNumber.country,
    name: countries.getName(phoneNumber.country, "en") || phoneNumber.country,
    dialCode: `+${phoneNumber.countryCallingCode}`,
  };
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

export function isValidVnPhoneNumber(phoneNumber: any): boolean {
  if (typeof phoneNumber !== "string") return false;

  return isValidPhoneNumber(phoneNumber, VN_COUNTRY_CODE);
}

export function isValidCountryCode(countryCode: any): boolean {
  if (typeof countryCode !== "string") return false;

  return countries.isValid(countryCode);
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
  return !Number.isNaN(date.getTime());
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
      !!color.name.trim(),
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
  if (Number.isNaN(birthDate.getTime())) return false;

  // Check if the date is in the past
  const today = new Date();
  return birthDate < today;
}

export function isValidNumString(numString: any): numString is string {
  if (typeof numString !== "string") return false;

  // Check if the string is a valid number
  const num = Number(numString);
  if (Number.isNaN(num)) return false;

  // Check if the number is finite
  if (!Number.isFinite(num)) return false;

  // Check if the string representation matches the number
  return numString === String(num);
}

export function isValidBooleanString(
  boolString: any,
): boolString is "true" | "false" {
  if (typeof boolString !== "string") return false;
  return ["true", "false"].includes(boolString);
}

/**
 * Checks if at least one of the provided arguments is a non-empty array.
 *
 * This function iterates through all provided arguments and returns `true` if it finds
 * any argument that is both an array and has a length greater than zero.
 *
 * @template T - The type of elements contained within the potential arrays.
 * @param args - A variable number of arguments to check.
 * @returns `true` if at least one argument is a non-empty array; otherwise, `false`.
 *
 * @example
 * nonEmptyList([], [1, 2], null); // returns true
 * nonEmptyList([], []); // returns false
 * nonEmptyList('string', 123); // returns false
 */
export function nonEmptyList<T>(...args: T[]): boolean {
  return args.some((arg) => Array.isArray(arg) && arg.length > 0);
}

// --- ADDRESS UTILS ---

export function formatAddress(address: UserAddressFormat): string {
  const ward = getWard(address.wardCode);
  const district = getDistrict(address.districtCode);
  const cityProvince = getCityProvince(address.cityProvinceCode);

  if (
    !ward ||
    !district ||
    !cityProvince ||
    !isValidCountryCode(address.countryCode)
  ) {
    throw new Error("Invalid address components");
  }

  return `${address.street}, ${address.apartmentNumber}, ${ward.name_with_type}, ${district.name_with_type}, ${cityProvince.name_with_type}, ${
    countries.getName(address.countryCode, "en") || address.countryCode
  }`;
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

export function isValidVnAddress(address: {
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
    (district) => district.parent_code === provinceCode,
  );

  return {
    total: filteredDistricts.length,
    data: filteredDistricts,
  };
}

export function getWardsByDistrictCode(districtCode: string) {
  const filteredWards = wards.data.filter(
    (ward) => ward.parent_code === districtCode,
  );

  return {
    total: filteredWards.length,
    data: filteredWards,
  };
}
