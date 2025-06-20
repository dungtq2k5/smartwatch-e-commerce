export const PASSWORD_MIN_LENGTH = 15;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const VERIFICATION_TOKEN_LENGTH = 6;
export const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const SPECIAL_CHARS_REGEX = /[~`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/? ]/;

export const PASSWORD_HINT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and contain at least one number or letter.`;
export const AVATAR_HINT_MESSAGE = `Avatar must be a valid image URL or file, with a maximum size of 5MB and dimensions between 200x200 and 1000x1000 pixels. Allowed formats are JPG and PNG.`;

export const AVATAR_ALLOWED_TYPES = [
  "image/jpg",
  "image/png",
];
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const AVATAR_MIN_WIDTH = 200;
export const AVATAR_MIN_HEIGHT = 200;
export const AVATAR_MAX_WIDTH = 1000;
export const AVATAR_MAX_HEIGHT = 1000;

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_TTL = 15 * 60 * 1000; // 15 minutes

export const PROJECT_NAME = "Smartwatch";

export const RESET_TOKEN_TLL = 15 * 60 * 1000; // 15 minutes