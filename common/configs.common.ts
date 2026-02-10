import { ADMIN_USER, SYSTEM_USER } from "../server/configs/configs";

export const PASSWORD_MIN_LENGTH = 15;
export const PASSWORD_MAX_LENGTH = 45;
export const PASSWORD_HINT_MESSAGE = `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long and contain at least one letter and one number.`;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const VERIFICATION_TOKEN_LENGTH = 6;
export const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const SPECIAL_CHARS_REGEX = /[~`!@#$%^&*()_+\-=[\]{};':"\\|,.<>/? ]/;

export const AVATAR_ALLOWED_TYPES = ["image/jpg", "image/png"] as const;
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const AVATAR_MIN_WIDTH = 200;
export const AVATAR_MIN_HEIGHT = 200;
export const AVATAR_MAX_WIDTH = 1000;
export const AVATAR_MAX_HEIGHT = 1000;
export const AVATAR_HINT_MESSAGE = `Avatar must be a valid image URL file with a maximum size of 5MB and dimensions between 200x200 and 1000x1000 pixels. Allowed formats are JPG and PNG.`;

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
export const PRODUCT_IMAGE_HINT_MESSAGE = `Product image must be a valid image file with a maximum size of 2MB and dimension between 200x200 pixels and 1500x1500 pixels. Allowed formats: JPG, PNG, and WebP.`; // Added WebP and clarified "recommended" sizes/dimensions

export const PRODUCT_LOGO_ALLOWED_TYPES = [
  "image/jpeg", // Standard for JPG
  "image/png",
  "image/webp", // Highly recommended for web performance
] as const;
export const PRODUCT_LOGO_MAX_SIZE = 2 * 1024 * 1024; // Adjusted for better web performance
export const PRODUCT_LOGO_MIN_WIDTH = 100;
export const PRODUCT_LOGO_MIN_HEIGHT = 100;
export const PRODUCT_LOGO_MAX_WIDTH = 800;
export const PRODUCT_LOGO_MAX_HEIGHT = 800;
export const PRODUCT_LOGO_BEST_WIDTH = 300;
export const PRODUCT_LOGO_BEST_HEIGHT = 300;
export const PRODUCT_LOGO_HINT_MESSAGE = `Product logo must be a valid image file with a maximum size of 2MB and dimensions between 100x100 pixels and 800x800 pixels. Allowed formats: JPG, PNG, and WebP.`; // Added WebP and clarified "recommended" sizes/dimensions

export const IMMUTABILITY_USER_EMAILS = [SYSTEM_USER.email] as const;
export const PROTECTED_USER_EMAILS = [ADMIN_USER.email] as const;
export const UNDELETABLE_USER_EMAILS = [
  SYSTEM_USER.email,
  ADMIN_USER.email,
] as const;
export const MODIFIABLE_PROTECTED_USER_FIELDS = [
  "fullName",
  "avatarUrl",
  "email",
  "password",
  "birth",
  "gender",
  "lastLogin",
  "updatedAt",
  "refreshToken",
] as const;

export const PROTECTED_ROLE_NAMES = ["admin", "buyer"] as const;
export const MODIFIABLE_PROTECTED_ROLES_FIELDS = [
  "createdAt",
  "updatedAt",
  "userAssigned",
] as const;

export const PRODUCT_NAME_MIN_LENGTH = 3;
export const PRODUCT_NAME_MAX_LENGTH = 100;

export const ESTIMATE_RECEIVED_TIME_GAP = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ESTIMATE_PICKUP_TIME_GAP = 1 * 24 * 60 * 60 * 1000; // 1 day
export const MAX_ESTIMATE_PICKUP_TIME_GAP = 3 * 24 * 60 * 60 * 1000; // 3 days

export const USER_GENDER_OPTIONS = ["male", "female", "other"] as const;
export const USER_DEFAULT_BIRTH_GAP = 20; // Default age gap from current for user auth by google
export const USER_SEARCH_SORT_OPTIONS = [
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
  "fullName_desc",
  "fullName_asc",
  "email_desc",
  "email_asc",
  "lastLogin_desc",
  "lastLogin_asc",
  "userBalanceCents_desc",
  "userBalanceCents_asc",
] as const;

export const VN_COUNTRY_CODE = "VN"; // Vietnam's country code

export const AUTH_PROVIDER_OPTIONS = ["local", "google"] as const;

export const PRODUCT_SEARCH_SORT_OPTIONS = [
  // Must match the field names in the backend
  "name_desc",
  "name_asc",
  "model_desc",
  "model_asc",
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
  "basePriceCents_desc",
  "basePriceCents_asc",
] as const;

export const PRODUCT_MODEL_SEARCH_SORT_OPTIONS = [
  // Must match the field names in the backend
  "name_desc",
  "name_asc",
  "priceCents_desc",
  "priceCents_asc",
  "stockPriceCents_desc",
  "stockPriceCents_asc",
  "releaseDate_desc",
  "releaseDate_asc",
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
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

  MODEL_WATER_RESISTANCE_OPTIONS: ["IP67", "IP68", "5 ATM", "10 ATM"] as const,

  MODEL_COMPATIBLE_BAND_LUG_WIDTH_MM_OPTIONS: [18, 20, 22, 24] as const,

  MODEL_HEALTH_FEATURES_OPTIONS: [
    "Heart Rate Monitoring",
    "Sleep Tracking",
    "Blood Oxygen Monitoring",
    "Stress Monitoring",
    "ECG",
    "Body Temperature Monitoring",
    "Hydration Tracking",
    "Menstrual Cycle Tracking",
    "Body Composition Analysis",
    "Fitness Age",
  ] as const,

  MODEL_SPORTS_FEATURES_OPTIONS: [
    "Running",
    "Cycling",
    "Swimming",
    "Walking",
    "Hiking",
    "Yoga",
    "Gym Workouts",
    "HIIT",
    "Pilates",
    "Dance",
  ] as const,

  MODEL_SPECIAL_FEATURES_OPTIONS: [
    "Voice Assistant",
    "Music Playback",
    "Contactless Payments",
    "Customizable Watch Faces",
    "Notifications",
    "Find My Phone",
    "Remote Camera Control",
    "Weather Updates",
    "Calendar Sync",
    "Smart Home Control",
  ] as const,

  MODEL_SUPPORTED_APPS_FOR_NOTIFICATIONS_OPTIONS: [
    "WhatsApp",
    "Facebook",
    "Instagram",
    "Twitter",
    "Telegram",
    "Slack",
    "Email",
    "SMS",
    "Google Calendar",
    "Spotify",
  ] as const,

  MODEL_CAMERA_FEATURES_OPTIONS: [
    "Auto Focus",
    "Face Detection",
    "HDR",
    "Panorama",
    "Night Mode",
    "Burst Mode",
    "Slow Motion",
    "Time Lapse",
    "Pro Mode",
    "Voice Control",
  ] as const,

  MODEL_COMPATIBLE_PHONE_OS_OPTIONS: [
    "Android",
    "iOS",
    "HarmonyOS",
    "Windows Phone",
    "KaiOS",
  ] as const,

  MODEL_APPS_CONNECT_OPTIONS: [
    "Google Fit",
    "Apple Health",
    "Samsung Health",
    "Fitbit",
    "Garmin Connect",
    "Huawei Health",
    "Strava",
    "MyFitnessPal",
    "Runkeeper",
    "MapMyRun",
  ] as const,

  MODEL_BATTERY_CHARGE_TYPE_OPTIONS: [
    "Wireless Charging",
    "USB-C",
    "Magnetic Charging",
    "Dock Charging",
    "Solar Charging",
    "Standard Charging",
  ] as const,

  MODEL_SCREEN_GLASS_MATERIAL_OPTIONS: [
    "Gorilla Glass",
    "Sapphire Crystal",
    "Dragontrail Glass",
    "Tempered Glass",
    "Plastic",
  ] as const,

  MODEL_SCREEN_REFRESH_RATE_OPTIONS: [30, 60, 90, 120] as const,

  MODEL_BEZEL_MATERIAL_OPTIONS: [
    "stainless steel",
    "aluminum",
    "plastic",
    "ceramic",
    "titanium",
  ] as const,

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

export const PRODUCT_TYPES = ["watch", "band"] as const;

export const MAX_ORDER_RETURN_IMG_UPLOAD = 5;
export const ORDER_RETURN_IMG_ALLOWED_TYPES = [
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic", // Common for iPhone
] as const;
export const ORDER_RETURN_IMG_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const ORDER_RETURN_IMG_HINT_MESSAGE = `Each image must be a valid image file with a maximum size of 5MB. Allowed formats are JPG, PNG, WEBP, and HEIC. You can upload up to ${MAX_ORDER_RETURN_IMG_UPLOAD} images.`;

export const BUYER_RETURN_REASON_MIN_LENGTH = 10;
export const BUYER_RETURN_REASON_MAX_LENGTH = 500;
export const BUYER_RETURN_REASON_HINT_MESSAGE = `Return reason must be between ${BUYER_RETURN_REASON_MIN_LENGTH} and ${BUYER_RETURN_REASON_MAX_LENGTH} characters long.`;

export const USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS = [
  "money_in", // money_in(refund)
  "money_out", // money_out(withdraw, payment to)
] as const;

export const WITHDRAWAL_METHODS = ["bank_transfer", "card"] as const;

export const BANK_ACCOUNT_TYPES = ["checking", "savings"] as const;
export const STRIPE_BANK_ACCOUNT_STATUS = [
  "pending",
  "enabled",
  "restricted",
  "rejected",
] as const;

export const DEFAULT_BANK_ACCOUNT_COUNTRY = "VN"; // ISO 3166-1 alpha-2 country code

export const DEFAULT_CURRENCY = "usd";

export const MIN_WITHDRAWAL_AMOUNT_CENTS = 1000; // $10.00

export const MAX_ITEMS_FOR_CREATE_BULK_CART = 10; // Max 10 items can be added to cart at once

export const MAX_USERS_TO_DELETE_BULK = 10;

export const MAX_PRODUCTS_TO_DELETE_BULK = 5;

export const MAX_PRODUCT_MODELS_TO_DELETE_BULK = 5;

export const MAX_PRODUCT_BRANDS_TO_DELETE_BULK = 5;

export const MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK = 5;

export const MAX_PRODUCT_OS_TO_DELETE_BULK = 5;

export const MAX_PRODUCT_IMG_UPLOAD = 8; // Max 8 images per product

export const MAX_PROVIDERS_TO_DELETE_BULK = 5;

export const MODEL_VARIATION_SEARCH_SORT_OPTIONS = [
  "name_desc",
  "name_asc",
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
  "additionalPriceCents_desc",
  "additionalPriceCents_asc",
  "stockAdditionalPriceCents_desc",
  "stockAdditionalPriceCents_asc",
  "stockQuantity_desc",
  "stockQuantity_asc",
] as const;

export const MAX_MODEL_VARIATIONS_TO_DELETE_BULK = 5;

export const VARIATION_INSTANCE_SEARCH_SORT_OPTIONS = [
  "sku_desc",
  "sku_asc",
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
] as const;

export const GRN_FILE_IMPORT_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;
export const GRN_FILE_IMPORT_NAME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
] as const;
export const GRN_FILE_IMPORT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const GRN_FILE_IMPORT_HEADERS = [
  "supplierSerialNumber",
  "supplierImeiNumber",
] as const;
export const GRN_SEARCH_SORT_OPTIONS = [
  "createdAt_desc",
  "createdAt_asc",
  "totalPriceCents_desc",
  "totalPriceCents_asc",
] as const;

export const PRODUCT_BRAND_SORT_OPTIONS = [
  "name_desc",
  "name_asc",
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
] as const;
export const PRODUCT_CATEGORY_SORT_OPTIONS = PRODUCT_BRAND_SORT_OPTIONS;
export const PRODUCT_OS_SORT_OPTIONS = PRODUCT_BRAND_SORT_OPTIONS;

export const FIREBASE_STORAGE_BUCKET_NAMES = [
  "user-avatar",
  "product-image",
  "order-return",
  "product-logo",
] as const;

// For mocking global addresses
export const COUNTRY_LOCALE_KEYS = [
  "en_US",
  "vi_VN",
  "en_GB",
  "fr_FR",
  "de_DE",
  "fr_CA",
] as const;

export const PROVIDER_SEARCH_SORT_OPTIONS = [
  "fullName_desc",
  "fullName_asc",
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
] as const;
