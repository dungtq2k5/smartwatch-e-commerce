import type { UserAddressFormat } from "../client/src/utils/types.ts";
import {
  PASSWORD_MIN_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_NAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "./configs.common.ts";
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

export function convertUtcToLocalISOString(utcIsoString: string): string {
  if (!utcIsoString.endsWith("Z")) return utcIsoString;

  const date = new Date(utcIsoString);

  if (isNaN(date.getTime())) return utcIsoString;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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

  // Password contains at least a letter + a number + length >= minLength -> valid
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
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
  if (!Array.isArray(arr)) return false;

  // Check if every element in the array is a string
  return arr.every((item) => typeof item === "string");
}

export function isValidDateTimeString(dateTimeString: any): boolean {
  if (typeof dateTimeString !== "string") return false;

  // Check if the string is a valid date-time format
  const date = new Date(dateTimeString);
  return !isNaN(date.getTime());
}

export function isValidHexColor(colorCode: any): boolean {
  if (typeof colorCode !== "string") return false;

  // This regex matches hex color codes of length 3, 4, 6, or 8,
  // preceded by a hash (#).
  // It supports formats like #rgb, #rgba, #rrggbb, and #rrggbbaa.
  const hexColorRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
  return hexColorRegex.test(colorCode);
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

export function isValidCoordinates(coords: { longitude: number; latitude: number }): boolean {
  const { longitude, latitude } = coords;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
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

export function isValidAddress(
  address: {
  wardCode: string,
  districtCode: string,
  cityProvinceCode: string }
): boolean {
  const {  wardCode, districtCode, cityProvinceCode } = address;

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
