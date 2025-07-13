import { ADMIN_USER, SYSTEM_USER } from "../server/configs/configs";

export const PASSWORD_MIN_LENGTH = 15;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const VERIFICATION_TOKEN_LENGTH = 6;
export const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const SPECIAL_CHARS_REGEX = /[~`!@#$%^&*()_+\-=[\]{};':"\\|,.<>/? ]/;

export const PASSWORD_HINT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and contain at least one number or letter.`;
export const AVATAR_HINT_MESSAGE = `Avatar must be a valid image URL or file, with a maximum size of 5MB and dimensions between 200x200 and 1000x1000 pixels. Allowed formats are JPG and PNG.`;

export const AVATAR_ALLOWED_TYPES = ["image/jpg", "image/png"] as const;
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const AVATAR_MIN_WIDTH = 200;
export const AVATAR_MIN_HEIGHT = 200;
export const AVATAR_MAX_WIDTH = 1000;
export const AVATAR_MAX_HEIGHT = 1000;

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL = 15 * 60 * 1000; // 15 minutes

export const PROJECT_NAME = "Smartwatch";

export const RESET_TOKEN_TLL = 15 * 60 * 1000; // 15 minutes

export const PRODUCT_IMAGE_HINT_MESSAGE = `Product image must be a valid image URL or file. Recommended maximum size: 2MB. Recommended dimensions: Between 200x200 pixels and 1500x1500 pixels. Allowed formats: JPG, PNG, and WebP.`; // Added WebP and clarified "recommended" sizes/dimensions

export const PRODUCT_IMAGE_ALLOWED_TYPES = [
  "image/jpeg", // Standard for JPG
  "image/png",
  "image/webp", // Highly recommended for web performance
] as const;
export const PRODUCT_IMAGE_MAX_SIZE = 2 * 1024 * 1024; // Adjusted for better web performance
export const PRODUCT_IMAGE_MIN_WIDTH = 200;
export const PRODUCT_IMAGE_MIN_HEIGHT = 200;
export const PRODUCT_IMAGE_MAX_WIDTH = 1500; // Increased for better detail/zoom capabilities
export const PRODUCT_IMAGE_MAX_HEIGHT = 1500; // Increased for better detail/zoom capabilities

export const IMMUTABILITY_USER_EMAILS: string[] = [SYSTEM_USER.email] as const;
export const PROTECTED_USER_EMAILS: string[] = [ADMIN_USER.email] as const;
export const MODIFIABLE_PROTECTED_USER_FIELDS = [
  "fullName",
  "avatarUrl",
  "email",
  "password",
  "birth",
  "gender",
  "lastLogin",
  "updatedAt",
] as const;

export const PROTECTED_ROLE_NAMES = ["admin", "buyer"] as const;
export const MODIFIABLE_PROTECTED_ROLES_FIELDS = [
  "createdAt",
  "updatedAt",
  "userAssigned",
] as const;

export const PRODUCT_NAME_MIN_LENGTH = 3;
export const PRODUCT_NAME_MAX_LENGTH = 100;

export const ESTIMATE_RECEIVED_DATE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const USER_GENDER_OPTIONS = ["male", "female", "other"] as const;

export const USER_DEFAULT_BIRTH_GAP = 20; // Default age gap from current for user auth by google

export const VN_COUNTRY_CODE = "84"; // Vietnam's country code