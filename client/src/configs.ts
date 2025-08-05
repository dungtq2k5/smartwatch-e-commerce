const ROOT_URL = "/api";

const AUTH_URL = `${ROOT_URL}/auth`;
export const SIGNUP_URL = `${AUTH_URL}/signup`;
export const AUTH_BY_GOOGLE_URL = `${AUTH_URL}/google`;
export const VERIFY_USER_URL = `${AUTH_URL}/verify-user`;
export const CHECK_AUTH_URL = `${AUTH_URL}/check-auth`;
export const LOGIN_URL = `${AUTH_URL}/login`;
export const LOGOUT_URL = `${AUTH_URL}/logout`;
export const FORGOT_PASSWORD_URL = `${AUTH_URL}/forgot-password`;
export const RESET_PASSWORD_URL = `${AUTH_URL}/reset-password`;

const USER_URL = `${ROOT_URL}/users`;
export const SELF_ADDRESSES_URL = `${USER_URL}/me/addresses`;
export const USER_UPDATE_SELF_GENERAL_INFO_URL = `${USER_URL}/me`;
export const USER_UPDATE_SELF_CONTACT_INFO_URL = `${USER_URL}/me/contact-info`;
export const USER_UPDATE_SELF_PASSWORD_URL = `${USER_URL}/me/password`;
export const USER_SET_SELF_PASSWORD_URL = `${USER_URL}/me/set-password`;
export const USER_DELETE_ACCOUNT_URL = `${USER_URL}/me`;

export const SELF_CART_URL = `${USER_URL}/me/carts`;

export const PRODUCT_URL = `${ROOT_URL}/products`;
export const PRODUCT_SEARCH_URL = PRODUCT_URL;
export const PRODUCT_CATEGORIES_URL = `${PRODUCT_URL}-categories`;
export const PRODUCT_BRANDS_URL = `${PRODUCT_URL}-brands`;
export const PRODUCT_OS_URL = `${PRODUCT_URL}-oses`;

export const AVATAR_HINT_MESSAGE = `
  File size: maximum 5MB.
  File extensions: JPG, PNG.
  File dimensions between 200x200 and 1000x1000 pixels.
`;

export const MAX_PRODUCTS_PER_PAGE = 6;
export const MAX_POPULAR_PRODUCTS_DISPLAY = 5;
export const MAX_PRODUCTS_SUGGEST_DISPLAY = 4;