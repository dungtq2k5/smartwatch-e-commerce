import {
  faBoxesPacking,
  faBoxOpen,
  faCheck,
  faClock,
  faFaceLaughBeam,
  faMoneyBillTransfer,
  faStar,
  faTruck,
  faWarehouse,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

// API Endpoints
const ROOT_URL = "/api/v1";

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
export const PRODUCT_CATEGORIES_URL = `${PRODUCT_URL}/categories`;
export const PRODUCT_BRANDS_URL = `${PRODUCT_URL}/brands`;
export const PRODUCT_OS_URL = `${PRODUCT_URL}/os`;

export const ORDER_URL = `${ROOT_URL}/orders`;
export const SELF_ORDER_URL = `${ORDER_URL}/me`;

export const PAYMENT_METHODS_URL = `${ROOT_URL}/payment-methods`;
export const PAYMENT_STATES_URL = `${ROOT_URL}/payment-states`;

export const DELIVERY_STATES_URL = `${ROOT_URL}/delivery-states`;

export const ORDER_STATES_URL = `${ROOT_URL}/order-states`;

export const RETURN_STATES_URL = `${ROOT_URL}/return-states`;

// Others
export const AVATAR_HINT_MESSAGE = `
  File size: maximum 5MB.
  File extensions: JPG, PNG.
  File dimensions between 200x200 and 1000x1000 pixels.
`;

export const MAX_PRODUCTS_PER_PAGE = 6;
export const MAX_POPULAR_PRODUCTS_DISPLAY = 5;
export const MAX_PRODUCTS_SUGGEST_DISPLAY = 4;
export const MAX_CART_ITEM_QUANTITY_SELECT = 5;
export const MAX_PURCHASES_PER_PAGE = 1; // DEV temp for testing

// level -> icon
export const ORDER_STATE_LEVEL_ICON_LEGEND = {
  1: faClock, // pending
  2: faCheck, // confirmed
  3: faBoxesPacking, // placed
  4: faTruck, // delivering
  5: faBoxOpen, // delivered
  6: faStar, // completed
  7: faXmark, // cancelled
} as const;

// level -> display string
export const ORDER_STATE_LEVEL_MSG_LEGEND = {
  1: "Your order is under verified, hang on.", // pending
  2: "Your order is being placed by us.", // confirmed
  3: "Your order has been placed successfully and ready to be delivered.", // placed
  4: "Your order is on the way, get ready to receive it.", // delivering
  5: "Your order has been delivered, please confirm receipt.", // delivered
  6: "Your order is completed, thank you for shopping with us.", // completed
  7: "Your order has been cancelled.", // cancelled
} as const;

// lookupId -> display string
export const ORDER_LOOKUPID_STATE_LEGEND = {
  "1": "Pending", // pending
  "2": "Pending", // confirmed
  "3": "Placed", // placed
  "4": "To Receive", // delivering
  "5": "To Confirm", // delivered
  "6": "Completed", // completed
  "7": "Cancelled", // cancelled
} as const;

// lookupId -> display string
export const ORDER_LOOKUPID_MSG_LEGEND = {
  "1": "Please make a payment to confirm your order.", // pending
  "2": "Hang tight! We're preparing your order.", // confirmed
  "3": "Your order is being processed for delivery.", // placed
  "4": "Your order is on the way! Get ready to receive it.", // delivering
  "5": "Confirm receipt after you've checked the received items.", // delivered
  "6": "", // completed
  "7": "Cancelled by you or the seller.", // cancelled
} as const;

// lookupId -> display string
export const RETURN_LOOKUPID_MSG_LEGEND = {
  "1": "Your return request is pending approval, hang on.", // pending approval
  "2": "Your return request has been approved. Please prepare the items for return.", // approved
  "3": "The items are being returned to us.", // items returning
  "4": "The items have been returned and are being processed.", // items returned
  "5": "Your refund is being processed.", // refunding
  "6": "Your refund has been issued and completed.", // refunded
  "7": "Your return request has been cancelled.", // cancelled
  "8": "Your return request has been declined.", // declined
} as const;

export const WAITING_EMOJI = "⏳";

// level -> icon
export const RETURN_STATE_LEVEL_ICON_LEGEND = {
  1: faClock, // pending approval
  2: faCheck, // approved
  3: faTruck, // items returning
  4: faWarehouse, // items returned
  5: faMoneyBillTransfer, // refunding
  6: faFaceLaughBeam, // refunded
  7: faXmark, // cancelled
  8: faXmark, // declined
} as const;

// level -> display string
export const RETURN_STATE_LEVEL_MSG_LEGEND = {
  1: "Your return request is pending approval, hang on.", // pending approval
  2: "Your return request has been approved, please prepare pack the items and wait to pickup.", // approved
  3: "The items are being returned to us.", // items returning
  4: "The items have been returned and are being processed.", // items returned
  5: "Your refund is being processed.", // refunding
  6: "Your refund has been issued and completed, thank you for shopping with us.", // refunded
  7: "Your return request has been cancelled.", // cancelled
  8: "Your return request has been declined.", // declined
} as const;

// lookupId -> display string
export const RETURN_LOOKUPID_STATE_LEGEND = {
  "1": "Pending", // pending approval
  "2": "Approved", // approved
  "3": "Waiting To Return", // items returning
  "4": "Processing", // items returned
  "5": "Refunding", // refunding
  "6": "Refund Completed", // refunded
  "7": "Request Cancelled", // cancelled
  "8": "Request Declined", // declined
} as const;