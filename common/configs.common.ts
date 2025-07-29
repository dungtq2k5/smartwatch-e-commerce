import { ADMIN_USER, SYSTEM_USER } from "../server/configs/configs";

export const PASSWORD_MIN_LENGTH = 15;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const VERIFICATION_TOKEN_LENGTH = 6;
export const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const SPECIAL_CHARS_REGEX = /[~`!@#$%^&*()_+\-=[\]{};':"\\|,.<>/? ]/;

export const PASSWORD_HINT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and contain at least one number or letter.`;

export const AVATAR_ALLOWED_TYPES = ["image/jpg", "image/png"] as const;
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const AVATAR_MIN_WIDTH = 200;
export const AVATAR_MIN_HEIGHT = 200;
export const AVATAR_MAX_WIDTH = 1000;
export const AVATAR_MAX_HEIGHT = 1000;
export const AVATAR_HINT_MESSAGE = `Avatar must be a valid image URL or file, with a maximum size of 5MB and dimensions between 200x200 and 1000x1000 pixels. Allowed formats are JPG and PNG.`;

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL = 15 * 60 * 1000; // 15 minutes

export const PROJECT_NAME = "Smartwatch";

export const RESET_TOKEN_TLL = 15 * 60 * 1000; // 15 minutes

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
export const PRODUCT_IMAGE_BEST_WIDTH = 600;
export const PRODUCT_IMAGE_BEST_HEIGHT = 696;
export const PRODUCT_IMAGE_HINT_MESSAGE = `Product image must be a valid image URL or file. Recommended maximum size: 2MB. Recommended dimensions: Between 200x200 pixels and 1500x1500 pixels. Allowed formats: JPG, PNG, and WebP.`; // Added WebP and clarified "recommended" sizes/dimensions

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

export const AUTH_PROVIDER_OPTIONS = ["local", "google"] as const;

export const PRODUCT_SEARCH_SORT_OPTIONS = [
  // Must match the field names in the backend
  "name_desc",
  "name_asc",
  "model_desc",
  "model_asc",
  "createdAt_desc",
  "createdAt_asc",
  "basePriceCents_desc",
  "basePriceCents_asc",
] as const;

export const PRODUCT_MOCK_OPTIONS = {
  MODEL_DISPLAY_TYPE_OPTIONS: [
    "AMOLED",
    "LCD",
    "OLED",
    "TFT",
    "IPS",
    "Retina",
    "Super AMOLED",
  ] as const,

  MODEL_CONNECTIVITY_OPTIONS: [
    "Bluetooth",
    "Wi-Fi",
    "NFC",
    "GPS",
    "Cellular",
  ] as const,

  MODEL_SENSORS_OPTIONS: [
    "Accelerometer",
    "Heart Rate",
    "GPS",
    "Gyroscope",
    "Barometer",
    "Compass",
  ] as const,

  MODEL_CASE_MATERIAL_OPTIONS: [
    "stainless steel",
    "aluminum",
    "plastic",
    "ceramic",
    "titanium",
  ] as const,

  MODEL_CHIPSET_OPTIONS: [
    "Exynos",
    "Snapdragon",
    "Apple S",
    "MediaTek",
    "Kirin",
  ] as const,

  MODEL_WATER_RESISTANCE_OPTIONS: [
    "IP67",
    "IP68",
    "5 ATM",
    "10 ATM",
    "Water Resistant",
    null,
  ] as const,

  MODEL_COMPATIBLE_BAND_LUG_WIDTH_MM_OPTIONS: [18, 20, 22, 24] as const,

  VARIATION_BAND_MATERIAL_OPTIONS: [
    "leather",
    "silicone",
    "metal",
    "fabric",
    "plastic",
  ] as const,

  VARIATION_BAND_CLASP_TYPE_OPTIONS: [
    "buckle",
    "deployant",
    "magnetic",
    "velcro",
    "snap",
  ] as const,

  VARIATION_BAND_STYLE_OPTIONS: [
    "sport",
    "dress",
    "casual",
    "luxury",
    "tactical",
    "smart",
  ] as const,
} as const;
