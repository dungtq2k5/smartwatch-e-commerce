const ROOT_URL = "/api";

export const SIGNUP_URL = `${ROOT_URL}/auth/signup`;
export const AUTH_BY_GOOGLE_URL = `${ROOT_URL}/auth/google`;
export const VERIFY_USER_URL = `${ROOT_URL}/auth/verify-user`;
export const CHECK_AUTH_URL = `${ROOT_URL}/auth/check-auth`;
export const LOGIN_URL = `${ROOT_URL}/auth/login`;
export const FORGOT_PASSWORD_URL = `${ROOT_URL}/auth/forgot-password`;
export const RESET_PASSWORD_URL = `${ROOT_URL}/auth/reset-password`;

export const SELF_ADDRESSES_URL = `${ROOT_URL}/users/me/addresses`;

export const AVATAR_HINT_MESSAGE = "Avatar must be a valid image, with a maximum size of 5MB and dimensions between 200x200 and 1000x1000 pixels. Allowed formats are JPG and PNG.";
