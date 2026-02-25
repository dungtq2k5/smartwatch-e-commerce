import {
  faBoxesPacking,
  faBoxOpen,
  faCheck,
  faClock,
  faFaceLaughBeam,
  faHandHoldingDollar,
  faMoneyBillTransfer,
  faReceipt,
  faSackDollar,
  faStar,
  faTruck,
  faWarehouse,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type {
  AddressFormData,
  AdminConfig,
  AdminGrnDisplayableField,
  AdminModelVariationDisplayableField,
  AdminOrderDisplayableField,
  AdminProductBrandDisplayableField,
  AdminProductCategoryDisplayableField,
  AdminProductDisplayableField,
  AdminProductModelDisplayableField,
  AdminProductOsDisplayableField,
  AdminProviderDisplayableField,
  AdminRoleDisplayableField,
  AdminUserDisplayableField,
  AdminVariationInstanceDisplayableField,
  GrnDisplayField,
  ModelVariationDisplayField,
  OrderDisplayField,
  PermissionOperationKey,
  ProductBrandDisplayField,
  ProductCategoryDisplayField,
  ProductCreationWizardStep,
  ProductDisplayField,
  ProductModelDisplayField,
  ProductOsDisplayField,
  ProviderAddressFormData,
  ProviderCreationWizardStep,
  ProviderDisplayField,
  RoleDisplayField,
  UserDisplayField,
  VariationInstanceDisplayField,
} from "./utils/types";
import type { JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCcAmex,
  faCcDiscover,
  faCcJcb,
  faCcMastercard,
  faCcVisa,
} from "@fortawesome/free-brands-svg-icons";
import { PROJECT_NAME } from "../../common/configs.common";

// --- API ENDPOINTS ---

const ROOT_URL = "/api/v1";

const AUTH_URL = `${ROOT_URL}/auth`;
export const SIGNUP_URL = `${AUTH_URL}/signup`;
export const AUTH_BY_GOOGLE_URL = `${AUTH_URL}/google`;
export const VERIFY_USER_URL = `${AUTH_URL}/verify-user`;
export const CHECK_AUTH_URL = `${AUTH_URL}/check-auth`;
export const CHECK_ADMIN_AUTH_URL = `${AUTH_URL}/check-admin-auth`;
export const LOGIN_URL = `${AUTH_URL}/login`;
export const ADMIN_LOGIN_URL = `${AUTH_URL}/admin-login`;
export const LOGOUT_URL = `${AUTH_URL}/logout`;
export const FORGOT_PASSWORD_URL = `${AUTH_URL}/forgot-password`;
export const RESET_PASSWORD_URL = `${AUTH_URL}/reset-password`;
export const REFRESH_TOKEN_URL = `${AUTH_URL}/refresh-token`;

export const USER_URL = `${ROOT_URL}/users`;
export const SELF_ADDRESSES_URL = `${ROOT_URL}/user-addresses/me`;
export const USER_UPDATE_SELF_GENERAL_INFO_URL = `${USER_URL}/me`;
export const USER_UPDATE_SELF_CONTACT_INFO_URL = `${USER_URL}/me/contact-info`;
export const USER_UPDATE_SELF_PASSWORD_URL = `${USER_URL}/me/password`;
export const USER_SET_SELF_PASSWORD_URL = `${USER_URL}/me/set-password`;
export const USER_DELETE_ACCOUNT_URL = `${USER_URL}/me`;

export const SELF_CART_URL = `${ROOT_URL}/user-carts/me`;

export const SELF_PAYMENT_METHOD_URL = `${ROOT_URL}/user-payment-methods/me`;

export const PRODUCT_URL = `${ROOT_URL}/products`;
export const PRODUCT_SEARCH_URL = PRODUCT_URL;
export const PRODUCT_ADMIN_SEARCH_URL = `${ROOT_URL}/products/admin`;
export const PRODUCT_CATEGORIES_URL = `${ROOT_URL}/product-categories`;
export const PRODUCT_BRANDS_URL = `${ROOT_URL}/product-brands`;
export const PRODUCT_OS_URL = `${ROOT_URL}/product-os`;

export const PRODUCT_MODEL_URL = `${ROOT_URL}/product-models`;

export const PRODUCT_VARIATION_URL = `${ROOT_URL}/product-variations`;

export const MODEL_VARIATION_URL = `${ROOT_URL}/model-variations`;

export const VARIATION_INSTANCE_URL = `${ROOT_URL}/variation-instances`;

export const INSTANCE_CONDITION_URL = `${ROOT_URL}/instance-conditions`;

export const ORDER_URL = `${ROOT_URL}/orders`;
export const SELF_ORDER_URL = `${ORDER_URL}/me`;
export const ORDER_STATES_URL = `${ROOT_URL}/order-states`;

export const PAYMENT_METHODS_URL = `${ROOT_URL}/payment-methods`;
export const PAYMENT_STATES_URL = `${ROOT_URL}/payment-states`;

export const DELIVERY_STATES_URL = `${ROOT_URL}/delivery-states`;

export const RETURN_URL = `${ROOT_URL}/returns`;
export const SELF_RETURN_URL = `${RETURN_URL}/me`;
export const RETURN_STATES_URL = `${ROOT_URL}/return-states`;

export const SELF_BANK_ACCOUNTS_URL = `${ROOT_URL}/user-bank-accounts/me`;

export const SELF_BALANCE_HISTORY_URL = `${ROOT_URL}/user-balance-history/me`;

export const SELF_WITHDRAWAL_REQUESTS_URL = `${ROOT_URL}/withdrawal-requests/me`;
export const WITHDRAWAL_STATES_URL = `${ROOT_URL}/withdrawal-states`;

export const ROLE_URL = `${ROOT_URL}/roles`;
export const PERMISSION_URL = `${ROOT_URL}/permissions`;

export const GRN_URL = `${ROOT_URL}/grns`;
export const GRN_STATES_URL = `${ROOT_URL}/grn-states`;

export const PROVIDER_URL = `${ROOT_URL}/providers`;

export const INVENTORY_MOVEMENT_TYPES_URL = `${ROOT_URL}/inventory-movement-types`;

// --- OTHERS ---

export const TOAST_DURATION = 5000; // in milliseconds

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
export const MAX_BALANCE_HISTORIES_PER_PAGE = 3; // DEV temp for testing

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
export const WARNING_EMOJI = "⚠️";
export const INSTRUCTION_EMOJI = "ℹ️";

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

export const STRIPE_URL = "https://stripe.com";
export const LINK_FAST_CHECKOUT_URL = "https://link.com";

// bank account status -> display string
export const USER_BANK_ACCOUNT_STATUS_LEGEND = {
  pending: "This account is not verified yet. Please verify it to use.",
  restricted:
    "This account is restricted. Please contact support for more info or delete it.",
  rejected:
    "This account is rejected. Please contact support for more info or delete it.",
} as const;

// user balance history type -> display icon
export const USER_BALANCE_HISTORY_TYPE_ICON_LEGEND = {
  refund: faHandHoldingDollar,
  withdraw_request: faSackDollar,
  payment_to: faReceipt,
} as const;

// lookupId -> display string
export const WITHDRAWAL_STATE_LOOKUPID_MSG_LEGEND = {
  "1": "Your withdrawal request is created and pending approval, hang on.", // pending
  "2": "Your withdrawal request has been approved and is being processed.", // approved
  "3": "Your withdrawal request has been approved and is being processed.", // processing
  "4": "Your withdrawal request has been completed successfully.", // completed
  "5": "Your withdrawal request failed because of some reasons. If you wish please make another request.", // failed
  "6": "Your withdrawal request has been cancelled by you.", // cancelled
  "7": "Your withdrawal request has been rejected by admin because of some reasons. Please contact support for more info.", // rejected
} as const;

// --- ADMIN DATA TABLE CONFIGURATIONS ---

export const DATA_DISPLAY_ROWS_PER_PAGE = [5, 10, 25, 50] as const;
export const DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE = DATA_DISPLAY_ROWS_PER_PAGE[0];

export const USER_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminUserDisplayableField, string>
> = {
  id: "ID",
  fullName: "Full Name",
  birth: "Birth",
  gender: "Gender",
  stripeCustomerId: "Stripe ID",
  userBalanceCents: "User balance",
  lastLogin: "Last login",
  createdAt: "Created at",
  updatedAt: "Updated at",
  email: "Email",
  phoneNumber: "Phone number",
  authProvider: "Auth type",
  accountVerified: "Account verified",
  accountStatus: "Account status",
  roles: "Roles",
  actions: "Actions",
};

export const PRODUCT_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminProductDisplayableField, string>
> = {
  id: "ID",
  name: "Name",
  type: "Type",
  categoryId: "Category",
  brandId: "Brand",
  description: "Description",
  basePriceCents: "Base price",
  totalModels: "Related models",
  totalVariations: "Related variations",
  createdBy: "Created by",
  createdAt: "Created at",
  updatedAt: "Updated at",
  stopSelling: "Stop selling",
  actions: "Actions",
};

export const PRODUCT_MODEL_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminProductModelDisplayableField, string>
> = {
  id: "ID",
  productId: "Product ID",
  name: "Name",
  priceCents: "Selling price",
  stockPriceCents: "Stock price",
  totalVariations: "Total variations",
  caseMaterial: "Case material",
  watchWeightMg: "Weight (mg)",
  compatibleBandLugWidthMm: "Band lug width (mm)",
  releaseDate: "Release date",
  stopSelling: "Stop selling",
  createdBy: "Created by",
  createdAt: "Created at",
  updatedAt: "Updated at",
  actions: "Actions",
};

export const MODEL_VARIATION_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminModelVariationDisplayableField, string>
> = {
  id: "ID",
  productId: "Product ID",
  productModelId: "Model ID",
  name: "Name",
  color: "Color",
  additionalPriceCents: "Additional price",
  stockAdditionalPriceCents: "Stock additional price",
  stockQuantity: "Stock quantity",
  createdBy: "Created by",
  createdAt: "Created at",
  updatedAt: "Updated at",
  stopSelling: "Stop selling",
  actions: "Actions",
};

export const VARIATION_INSTANCE_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminVariationInstanceDisplayableField, string>
> = {
  id: "ID",
  sku: "SKU",
  modelVariationId: "Model Variation ID",
  supplierImeiNumber: "IMEI Number",
  supplierSerialNumber: "Serial Number",
  conditionId: "Condition",
  isActive: "Active Status",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const GRN_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminGrnDisplayableField, string>
> = {
  id: "ID",
  name: "Name",
  provider: "Provider",
  createdBy: "Created By",
  totalPriceCents: "Total Price",
  quantity: "Quantity",
  notes: "Notes",
  createdAt: "Created At",
  state: "State",
  reversed: "Reversed",
  actions: "Actions",
};

export const PRODUCT_BRAND_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminProductBrandDisplayableField, string>
> = {
  id: "ID",
  name: "Name",
  description: "Description",
  createdBy: "Created By",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const PRODUCT_CATEGORY_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminProductCategoryDisplayableField, string>
> = {
  id: "ID",
  name: "Name",
  description: "Description",
  createdBy: "Created By",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const PRODUCT_OS_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminProductOsDisplayableField, string>
> = {
  id: "ID",
  name: "Name",
  description: "Description",
  createdBy: "Created By",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const PROVIDER_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminProviderDisplayableField, string>
> = {
  id: "ID",
  fullName: "Full Name",
  email: "Email",
  phoneNumber: "Phone Number",
  createdBy: "Created By",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const ROLE_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminRoleDisplayableField, string>
> = {
  id: "ID",
  name: "Name",
  userAssigned: "Users assigned",
  permissions: "Total permissions",
  createdBy: "Created By",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const ORDER_FIELD_LABEL_LEGEND: Readonly<
  Record<AdminOrderDisplayableField, string>
> = {
  id: "ID",
  orderedBy: "Ordered By",
  items: "Items",
  deliveryAddress: "Delivery Address",
  transaction: "Transaction",
  paymentSummary: "Total Amount", // paymentSummary.finalAmountCents
  paymentMethodId: "Payment Method",
  paymentStates: "Payment States",
  deliveryStates: "Delivery States",
  states: "Order States",
  orderDate: "Order Date",
  estimateReceivedDate: "Estimated Received Date",
  receivedDate: "Received Date",
  fulfilled: "Fulfilled",
  canReturn: "Returnable",
  createdAt: "Created At",
  updatedAt: "Updated At",
  actions: "Actions",
};

export const DEFAULT_ADMIN_USER_DISPLAY_FIELDS: UserDisplayField[] = [
  { name: "id", visible: false, exportable: true },
  { name: "fullName", visible: true, exportable: true },
  { name: "birth", visible: true, exportable: true },
  { name: "gender", visible: true, exportable: true },
  { name: "stripeCustomerId", visible: false, exportable: true },
  { name: "userBalanceCents", visible: true, exportable: true },
  { name: "lastLogin", visible: true, exportable: true },
  { name: "createdAt", visible: false, exportable: true },
  { name: "updatedAt", visible: false, exportable: true },
  { name: "email", visible: true, exportable: true },
  { name: "phoneNumber", visible: true, exportable: true },
  { name: "authProvider", visible: false, exportable: true },
  { name: "accountVerified", visible: true, exportable: true },
  { name: "accountStatus", visible: true, exportable: true },
  { name: "roles", visible: false, exportable: true },
  { name: "actions", visible: true, exportable: false },
];

export const DEFAULT_ADMIN_PRODUCT_DISPLAY_FIELDS: ProductDisplayField[] = [
  { name: "id", visible: false, exportable: true },
  { name: "name", visible: true, exportable: true },
  { name: "type", visible: true, exportable: true },
  { name: "categoryId", visible: true, exportable: true },
  { name: "brandId", visible: true, exportable: true },
  { name: "description", visible: false, exportable: true },
  { name: "basePriceCents", visible: true, exportable: true },
  { name: "totalModels", visible: true, exportable: true },
  { name: "totalVariations", visible: true, exportable: true },
  { name: "createdBy", visible: false, exportable: true },
  { name: "createdAt", visible: false, exportable: true },
  { name: "updatedAt", visible: false, exportable: true },
  { name: "stopSelling", visible: true, exportable: true },
  { name: "actions", visible: true, exportable: false },
];

export const DEFAULT_ADMIN_PRODUCT_MODEL_DISPLAY_FIELDS: ProductModelDisplayField[] =
  [
    { name: "id", visible: true, exportable: true },
    { name: "productId", visible: false, exportable: true },
    { name: "name", visible: true, exportable: true },
    { name: "priceCents", visible: true, exportable: true },
    { name: "stockPriceCents", visible: false, exportable: true },
    { name: "totalVariations", visible: true, exportable: true },
    { name: "caseMaterial", visible: false, exportable: true },
    { name: "watchWeightMg", visible: false, exportable: true },
    { name: "compatibleBandLugWidthMm", visible: false, exportable: true },
    { name: "releaseDate", visible: true, exportable: true },
    { name: "createdBy", visible: false, exportable: true },
    { name: "createdAt", visible: false, exportable: true },
    { name: "updatedAt", visible: false, exportable: true },
    { name: "stopSelling", visible: true, exportable: true },
    { name: "actions", visible: true, exportable: false },
  ];

export const DEFAULT_ADMIN_MODEL_VARIATION_DISPLAY_FIELDS: ModelVariationDisplayField[] =
  [
    { name: "id", visible: true, exportable: true },
    { name: "productId", visible: false, exportable: true },
    { name: "productModelId", visible: false, exportable: true },
    { name: "name", visible: true, exportable: true },
    { name: "color", visible: true, exportable: true },
    { name: "additionalPriceCents", visible: true, exportable: true },
    { name: "stockAdditionalPriceCents", visible: false, exportable: true },
    { name: "stockQuantity", visible: true, exportable: true },
    { name: "createdBy", visible: false, exportable: true },
    { name: "createdAt", visible: false, exportable: true },
    { name: "updatedAt", visible: false, exportable: true },
    { name: "stopSelling", visible: true, exportable: true },
    { name: "actions", visible: true, exportable: false },
  ];

export const DEFAULT_ADMIN_VARIATION_INSTANCE_DISPLAY_FIELDS: VariationInstanceDisplayField[] =
  [
    { name: "id", visible: true, exportable: true },
    { name: "sku", visible: true, exportable: true },
    { name: "modelVariationId", visible: false, exportable: true },
    { name: "supplierImeiNumber", visible: true, exportable: true },
    { name: "supplierSerialNumber", visible: true, exportable: true },
    { name: "conditionId", visible: true, exportable: true },
    { name: "isActive", visible: true, exportable: true },
    { name: "createdAt", visible: false, exportable: true },
    { name: "updatedAt", visible: false, exportable: true },
    { name: "actions", visible: true, exportable: false },
  ];

export const DEFAULT_ADMIN_GRN_DISPLAY_FIELDS: GrnDisplayField[] = [
  { name: "id", visible: true, exportable: true },
  { name: "name", visible: true, exportable: true },
  { name: "provider", visible: true, exportable: true },
  { name: "createdBy", visible: false, exportable: true },
  { name: "totalPriceCents", visible: true, exportable: true },
  { name: "quantity", visible: true, exportable: true },
  { name: "notes", visible: false, exportable: true },
  { name: "createdAt", visible: true, exportable: true },
  { name: "state", visible: true, exportable: true },
  { name: "reversed", visible: true, exportable: true },
  { name: "actions", visible: true, exportable: false },
];

export const DEFAULT_ADMIN_PRODUCT_BRAND_DISPLAY_FIELDS: ProductBrandDisplayField[] =
  [
    { name: "id", visible: true, exportable: true },
    { name: "name", visible: true, exportable: true },
    { name: "description", visible: false, exportable: true },
    { name: "createdBy", visible: false, exportable: true },
    { name: "createdAt", visible: true, exportable: true },
    { name: "updatedAt", visible: false, exportable: true },
    { name: "actions", visible: true, exportable: false },
  ];

export const DEFAULT_ADMIN_PRODUCT_CATEGORY_DISPLAY_FIELDS: ProductCategoryDisplayField[] =
  DEFAULT_ADMIN_PRODUCT_BRAND_DISPLAY_FIELDS;

export const DEFAULT_ADMIN_PRODUCT_OS_DISPLAY_FIELDS: ProductOsDisplayField[] =
  DEFAULT_ADMIN_PRODUCT_BRAND_DISPLAY_FIELDS;

export const DEFAULT_ADMIN_PROVIDER_DISPLAY_FIELDS: ProviderDisplayField[] = [
  { name: "id", visible: true, exportable: true },
  { name: "fullName", visible: true, exportable: true },
  { name: "email", visible: true, exportable: true },
  { name: "phoneNumber", visible: true, exportable: true },
  { name: "createdBy", visible: false, exportable: true },
  { name: "createdAt", visible: true, exportable: true },
  { name: "updatedAt", visible: false, exportable: true },
  { name: "actions", visible: true, exportable: false },
];

export const DEFAULT_ADMIN_ROLE_DISPLAY_FIELDS: RoleDisplayField[] = [
  { name: "id", visible: true, exportable: true },
  { name: "name", visible: true, exportable: true },
  { name: "userAssigned", visible: true, exportable: true },
  { name: "createdBy", visible: false, exportable: true },
  { name: "createdAt", visible: true, exportable: true },
  { name: "updatedAt", visible: false, exportable: true },
  { name: "actions", visible: true, exportable: false },
];

export const DEFAULT_ADMIN_ORDER_DISPLAY_FIELDS: OrderDisplayField[] = [
  { name: "id", visible: true, exportable: true },
  { name: "orderedBy", visible: true, exportable: true },
  { name: "items", visible: false, exportable: true },
  { name: "deliveryAddress", visible: true, exportable: true },
  { name: "transaction", visible: false, exportable: true },
  { name: "paymentSummary", visible: true, exportable: true },
  { name: "paymentMethodId", visible: true, exportable: true },
  { name: "paymentStates", visible: false, exportable: true },
  { name: "deliveryStates", visible: true, exportable: true },
  { name: "states", visible: true, exportable: true },
  { name: "orderDate", visible: true, exportable: true },
  { name: "estimateReceivedDate", visible: true, exportable: true },
  { name: "receivedDate", visible: false, exportable: true },
  { name: "fulfilled", visible: false, exportable: true },
  { name: "canReturn", visible: false, exportable: true },
  { name: "createdAt", visible: true, exportable: true },
  { name: "updatedAt", visible: false, exportable: true },
  { name: "actions", visible: true, exportable: false },
];

export const CARD_BRAND_ICONS: { [key: string]: JSX.Element } = {
  visa: (
    <FontAwesomeIcon
      icon={faCcVisa}
      size="2x"
      className="text-primary-emphasis"
    />
  ),
  mastercard: (
    <FontAwesomeIcon icon={faCcMastercard} size="2x" className="text-danger" />
  ),
  discover: (
    <FontAwesomeIcon icon={faCcDiscover} size="2x" className="text-warning" />
  ),
  jcb: (
    <FontAwesomeIcon
      icon={faCcJcb}
      size="2x"
      className="text-primary-emphasis"
    />
  ),
  amex: <FontAwesomeIcon icon={faCcAmex} size="2x" className="text-info" />,
};

export const CONFIG_STORAGE_KEY = `${PROJECT_NAME.toLowerCase()}-admin-ui-configs`;

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  userManagementDisplayFields: DEFAULT_ADMIN_USER_DISPLAY_FIELDS,
  productManagementDisplayFields: DEFAULT_ADMIN_PRODUCT_DISPLAY_FIELDS,
  productModelManagementDisplayFields:
    DEFAULT_ADMIN_PRODUCT_MODEL_DISPLAY_FIELDS,
  modelVariationManagementDisplayFields:
    DEFAULT_ADMIN_MODEL_VARIATION_DISPLAY_FIELDS,
  variationInstanceManagementDisplayFields:
    DEFAULT_ADMIN_VARIATION_INSTANCE_DISPLAY_FIELDS,
  grnManagementDisplayFields: DEFAULT_ADMIN_GRN_DISPLAY_FIELDS,
  productBrandManagementDisplayFields:
    DEFAULT_ADMIN_PRODUCT_BRAND_DISPLAY_FIELDS,
  productCategoryManagementDisplayFields:
    DEFAULT_ADMIN_PRODUCT_CATEGORY_DISPLAY_FIELDS,
  productOsManagementDisplayFields: DEFAULT_ADMIN_PRODUCT_OS_DISPLAY_FIELDS,
  providerManagementDisplayFields: DEFAULT_ADMIN_PROVIDER_DISPLAY_FIELDS,
  roleManagementDisplayFields: DEFAULT_ADMIN_ROLE_DISPLAY_FIELDS,
  orderManagementDisplayFields: DEFAULT_ADMIN_ORDER_DISPLAY_FIELDS,
};

export const GRN_FILE_IMPORT_WORKSHEET_NAME = "grn-import-template"; // Must match with the worksheet name in the Excel template file

export const PRODUCT_CREATION_WIZARD_STEPS: ProductCreationWizardStep[] = [
  "product",
  "model",
  "variation",
  "grn",
]; // Order matters

export const PROVIDER_CREATION_WIZARD_STEPS: ProviderCreationWizardStep[] = [
  "provider",
  "address",
]; // Order matters

export const DISABLED_TITLE_FOR_VIEWING = "You don't have permission to view";
export const DISABLED_TITLE_FOR_PERFORMING =
  "You don't have permission to perform";

export const DEFAULT_PHONE_COUNTRY_CODE = "VN"; // Vietnam

/**
 * A central location in Ho Chi Minh City, Vietnam, represented as [latitude, longitude].
 * This can be used as a default location for various features like address creation, map centering, etc.
 */
export const VN_HCM_CITY_CENTRAL_LOCATION: [10.762622, 106.660172] = [
  10.762622, 106.660172,
] as const;

export const DEFAULT_CITY_PROVINCE_CODE = "79"; // Ho Chi Minh City
export const DEFAULT_DISTRICT_CODE = "771"; // District 10
export const DEFAULT_WARD_CODE = "27202"; // Ward 12

export const DEFAULT_USER_ADDRESS_FORM_DATA: AddressFormData = {
  name: { val: "" },
  phoneNumber: { val: "" },
  apartmentNumber: { val: "" },
  street: { val: "" },
  cityProvinceCode: DEFAULT_CITY_PROVINCE_CODE,
  districtCode: DEFAULT_DISTRICT_CODE,
  wardCode: DEFAULT_WARD_CODE,
  location: VN_HCM_CITY_CENTRAL_LOCATION,
  isDefault: false,
} as const;

export const DEFAULT_PROVIDER_ADDRESS_FORM_DATA: ProviderAddressFormData = {
  name: { val: "" },
  addressLine1: { val: "" },
  addressLine2: { val: "" },
  locality: { val: "" },
  adminAreaL1: { val: "" },
  adminAreaL2: { val: "" },
  postalCode: { val: "" },
  phoneNumber: { val: "" },
  /** Represent [latitude, longitude] location for the address */
  location: VN_HCM_CITY_CENTRAL_LOCATION,
  notes: { val: "" },
  isDefault: false,
};

export const PERMISSION_CATEGORIES_LEGEND: Record<string, string> = {
  // --- USERS & AUTH ---
  usr: "User",
  user: "User",
  users: "User",
  usr_role: "User Role",
  user_role: "User Role",
  usr_addr: "User Address",
  user_address: "User Address",
  usr_paym: "User Payment Method",
  user_payment: "User Payment Method",
  usr_cart: "User Cart",
  user_cart: "User Cart",
  usr_bankacc: "User Bank Account",
  user_bank: "User Bank Account",

  // --- PRODUCTS & CATALOG ---
  product: "Product",
  products: "Product",
  product_model: "Product Model",
  prod_model: "Product Model",
  model_variation: "Model Variation",
  variation: "Model Variation",
  variation_instance: "Variation Instance",
  instance: "Variation Instance",
  product_cat: "Product Category",
  category: "Product Category",
  product_brand: "Product Brand",
  brand: "Product Brand",
  product_os: "Product OS",
  os: "Product OS",

  // --- ORDERS & TRANSACTIONS ---
  order: "Order",
  orders: "Order",
  order_return: "Order Return",
  return: "Order Return",
  withdrawal_req: "Withdrawal Request",
  withdrawal: "Withdrawal Request",

  // --- INVENTORY & LOGISTICS ---
  grn: "Goods Receipt Note",
  inventory: "Provider Inventory",
  provider_inventory: "Provider Inventory",
};

export const PERMISSION_OPERATIONS: PermissionOperationKey[] = [
  "create",
  "read",
  "update",
  "delete",
] as const;
