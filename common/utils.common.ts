import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "./configs.common.ts";

export function removeOddSpaces(val: string): string {
  // AI help
  return val.replace(/\s+/g, " ").trim();
}

export function removeAllSpaces(val: string): string {
  // AI gen
  return val.replace(/\s/g, "");
}

export function genRandomPassword(): string {
  // AI gen
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
  // AI gen
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const allChars = letters + numbers;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  return result;
}

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

export function isValidVnPhoneNumber(phoneNumber: any): boolean {
  if (typeof phoneNumber !== "string") return false;

  // Vietnamese phone numbers start with 0 and are 10 or 11 digits long
  const phoneRegex = /^(0[1-9][0-9]{8}|0[1-9][0-9]{9})$/;
  return phoneRegex.test(phoneNumber);
}

export function convertToE164(phoneNumber: string): string {
  // Convert Vietnamese phone number to E.164 format
  // E.164 format for Vietnam is +84 followed by the phone number without the leading 0
  if (!isValidVnPhoneNumber(phoneNumber)) {
    throw new Error("Invalid Vietnamese phone number");
  }

  return `+84${phoneNumber.slice(1)}`; // Remove leading 0 and add +84
}

export function isStringArray(arr: any): boolean {
  if (!Array.isArray(arr)) return false;

  // Check if every element in the array is a string
  return arr.every((item) => typeof item === "string");
}
