import {
  ORDER_VARIATION_INSTANCE_STATES,
  PERMISSION_LIST,
} from "../server/configs/configs";
import {
  USER_GENDER_OPTIONS,
  AUTH_PROVIDER_OPTIONS,
  PRODUCT_SEARCH_SORT_OPTIONS,
  PRODUCT_TYPES,
  VN_COUNTRY_CODE,
} from "./configs.common";

export type ErrorResponse = {
  readonly success: false;
  message: string;
};

export type SuccessResponse<T = any> = {
  readonly success: true;
  message?: string;
  data?: T;
};

export type Response = ErrorResponse | SuccessResponse;

type BaseUserResponse = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isPhoneNumberVerified: boolean;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  stripeCustomerId: string | null;
  userBalanceCents: number;
  authProvider: (typeof AUTH_PROVIDER_OPTIONS)[number];
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserResponse = BaseUserResponse &
  (
    | {
        email: string;
        phoneNumber: null;
      }
    | {
        email: null;
        phoneNumber: string;
      }
    | {
        email: string;
        phoneNumber: string;
      }
  );

export type CheckAuthResponse = {
  user: UserResponse;
  isAuth: boolean;
};

export type AdminUserResponse = UserResponse & {
  isLocked: boolean;
};

export type AdminUserListResponse = {
  total: number;
  users: {
    total: number;
    users: AdminUserResponse[];
  };
  offset: number;
  limit: number;
};

export type EmailOrPhoneNumberCreate =
  | {
      email: string;
      phoneNumber?: null;
    }
  | {
      email?: null;
      phoneNumber: string;
    };

export type UserSignup = {
  fullName: string;
  password: string;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
} & EmailOrPhoneNumberCreate;

export type UserLogin = {
  password: string;
} & EmailOrPhoneNumberCreate;

export type VerifyType = "email" | "phoneNumber";

export type UserVerify = {
  type: VerifyType;
  code: string;
};

export type UserAuthByGoogle = {
  idToken: string;
  accessToken: string; // To user sensitive data like birth, gender, etc.
};

export type UserForgotPassword = EmailOrPhoneNumberCreate;

export type UserUpdateEmail = Partial<{
  email: string | null;
  isEmailVerified: boolean;
}>;

export type UserUpdatePhoneNumber = Partial<{
  phoneNumber: string | null;
  isPhoneNumberVerified: boolean;
}>;

export type UserUpdate = Partial<{
  fullName: string;
  avatarUrl: string | null;
  password: string;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  userBalanceCents: number;
  isLocked: boolean;
  roleIds: string[] | null;
}>;

export type UserUpdateSelfGeneralInfo = Omit<
  UserUpdate,
  "password" | "userBalanceCents" | "isLocked" | "roleIds"
>;

export type UserUpdateSelfPassword = {
  currentPassword: string;
  newPassword: string;
};

// For user who auth by provider like Google, Facebook, etc.
export type UserSetSelfPassword = {
  password: string;
};

export type GeoJSONPoint = {
  readonly locationType: "point";
  coordinates: [number, number]; // [longitude, latitude]
};

export type BaseUserAddress = {
  id: string;
  name: string;
  userId: string;
  street: string;
  apartmentNumber: string;
  wardCode: string;
  districtCode: string;
  cityProvinceCode: string;
  readonly countryCode: typeof VN_COUNTRY_CODE;
  location: GeoJSONPoint;
  phoneNumber: string;
  fullAddress: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserAddressCompare = Omit<
  BaseUserAddress,
  | "id"
  | "userId"
  | "countryCode"
  | "fullAddress"
  | "isDefault"
  | "createdAt"
  | "updatedAt"
> & {
  countryCode: string;
};

export type UserAddressResponse = Omit<BaseUserAddress, "userId">;

export type UserAddressListResponse = {
  total: number;
  addresses: UserAddressResponse[];
};

export type UserAddressCreate = Omit<
  BaseUserAddress,
  | "id"
  | "userId"
  | "location"
  | "fullAddress"
  | "createdAt"
  | "updatedAt"
  | "isDefault"
> & {
  location: {
    longitude: number;
    latitude: number;
  };
  isDefault?: boolean;
};

export type UserAddressUpdate = Partial<UserAddressCreate>;

export type AdminUserAddressResponse = UserAddressResponse & {
  userId: string;
};

export type BaseUserCart = {
  userId: string;
  variationId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};
export type UserCartCreate = {
  variationId: string;
  quantity?: number;
};
export type UserCartBulkCreate = {
  items: UserCartCreate[];
};
/**
 * Represents the detailed response for a user's cart item, excluding the user ID.
 *
 * @remarks
 * This type extends {@link BaseUserCart} (excluding the `userId` property) and adds additional
 * information such as the total price in cents, selling states, and detailed variation/model/product info.
 *
 * @property {number} totalCents - The total price in cents, calculated as `(additionalPriceCents + model.priceCents) * item.quantity`.
 * @property {boolean} stopSelling - Indicates whether any of the product, model, or variation is no longer being sold.
 * @property variation - Detailed information about the selected model variation.
 * @property variation.id - The unique identifier of the model variation.
 * @property variation.name - The name of the model variation.
 * @property variation.color - The color of the model variation.
 * @property variation.imageUrls - An array of image URLs for the model variation.
 * @property variation.stockQuantity - The available stock quantity for the model variation.
 * @property variation.productModel - Information about the product model.
 * @property variation.productModel.id - The unique identifier of the product model.
 * @property variation.productModel.name - The name of the product model.
 * @property variation.productModel.priceCents - The price of the product model in cents.
 * @property variation.productModel.product - Information about the parent product.
 * @property variation.productModel.product.id - The unique identifier of the product.
 * @property variation.productModel.product.name - The name of the product.
 * @property variation.productModel.product.type - The type/category of the product.
 * @property variation.productModel.product.brand - Information about the product's brand.
 * @property variation.productModel.product.brand.id - The unique identifier of the brand.
 * @property variation.productModel.product.brand.name - The name of the brand.
 * @property variation.productModel.product.brand.logoUrl - The logo URL of the brand.
 * @property variation.productModel.product.category - Information about the product's category.
 * @property variation.productModel.product.category.id - The unique identifier of the category.
 * @property variation.productModel.product.category.name - The name of the category.
 */
export type UserCartResponse = Omit<BaseUserCart, "userId" | "variationId"> & {
  totalCents: number;
  stopSelling: boolean;
  variation: Pick<
    ModelVariationResponse,
    | "id"
    | "name"
    | "color"
    | "imageUrls"
    | "additionalPriceCents"
    | "stockQuantity"
  > & {
    productModel: Pick<ProductModelResponse, "id" | "name" | "priceCents"> & {
      product: Pick<ProductResponse, "id" | "name" | "type"> & {
        brand: Pick<ProductBrandResponse, "id" | "name" | "logoUrl">;
        category: Pick<ProductCategoryResponse, "id" | "name">;
      };
    };
  };
};
/**
 * Represents a response containing details about a user's cart.
 *
 * @property total - The total number of distinct items in the cart.
 * @property cart - An array of detailed information for each item in the user's cart.
 */
export type UserCartListResponse = {
  total: number;
  items: UserCartResponse[];
};

export type CreateOtp = {
  type: VerifyType;
  userId: string;
};

export type UserUpdateContactInfo = {
  type: VerifyType;
  value: string;
};

export type PermissionCode = (typeof PERMISSION_LIST)[number]["code"];

export type UserCreate = {
  fullName: string;
  avatarUrl: string;
  email?: string | null;
  isEmailVerified?: boolean;
  phoneNumber?: string | null;
  isPhoneNumberVerified?: boolean;
  password: string;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  userBalanceCents?: number;
  isLocked?: boolean;
  roleIds?: string[];
};

export type RoleCreate = {
  name: string;
  permissionIds?: string[] | null;
};

export type RoleResponse = {
  id: string;
  name: string;
  userAssigned: number;
  permissions: {
    id: string;
    assignedAt: string;
    assignedBy: string;
  }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type RoleListResponse = {
  total: number;
  roles: RoleResponse[];
};

export type RoleUpdate = {
  name?: string;
  permissionIds?: string[] | null;
};

export type ProductCreate = {
  name: string;
  type: (typeof PRODUCT_TYPES)[number];
  brandId: string;
  categoryId: string;
  description: string;
  imageUrls?: string[] | null;
  stopSelling?: boolean;
  basePriceCents: number;
};

export type ProductUpdate = Partial<ProductCreate>;

export type ProductResponse = {
  id: string;
  name: string;
  type: (typeof PRODUCT_TYPES)[number];
  brand: ProductBrandResponse;
  category: ProductCategoryResponse;
  description: string;
  imageUrls: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stopSelling: boolean;
  basePriceCents: number;
};

/**
 * Represents the detailed response for a product, extending the basic ProductResponse.
 *
 * @remarks
 * This type includes additional information about the product's models and their variations.
 *
 * @property models - An object containing:
 * - `total`: The total number of models available for the product.
 * - `models`: An array of product models, each extending ProductModelResponse and including:
 *   - `variations`: An object containing:
 *     - `total`: The total number of variations for the model.
 *     - `variations`: An array of ModelVariationResponse objects representing each variation.
 */
export type ProductDetailResponse = ProductResponse & {
  models: {
    total: number;
    models: (ProductModelResponse & {
      variations: {
        total: number;
        variations: ModelVariationResponse[];
      };
    })[];
  };
};

export type ProductListResponse = {
  products: {
    total: number;
    products: ProductResponse[];
  };
  offset: number;
  limit: number;
  total: number; // Total filter match but exclude offset or limit
};

export type ProductBrandCreate = {
  name: string;
  logoUrl?: string | null;
  description?: string | null;
};

export type ProductBrandUpdate = Partial<ProductBrandCreate>;

export type ProductBrandResponse = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ProductBrandListResponse = {
  brands: {
    total: number;
    brands: ProductBrandResponse[];
  };
  offset: number;
  limit: number;
  total: number;
};

export type ProductCategoryCreate = Omit<ProductBrandCreate, "logoUrl">;
export type ProductCategoryUpdate = Omit<ProductBrandUpdate, "logoUrl">;
export type ProductCategoryResponse = Omit<ProductBrandResponse, "logoUrl">;
export type ProductCategoryListResponse = {
  categories: {
    total: number;
    categories: ProductCategoryResponse[];
  };
  offset: number;
  limit: number;
  total: number;
};

export type ProductOsCreate = ProductBrandCreate;
export type ProductOsUpdate = ProductBrandUpdate;
export type ProductOsResponse = ProductBrandResponse;
export type ProductOsListResponse = {
  oses: {
    total: number;
    oses: ProductOsResponse[];
  };
  offset: number;
  limit: number;
  total: number;
};

export type ProductModelCreate = {
  productId: string;
  name: string;
  priceCents: number;
  stockPriceCents: number;
  imageUrls?: string[] | null;
  feature: {
    speakerAndMicrophone?: boolean | null;
    waterResistance?: {
      rating: string;
      description?: string | null;
    } | null;
    utilities?: {
      healths?: string[] | null;
      sports?: string[] | null;
      specials?: string[] | null;
      others?: string[] | null;
    } | null;
    supportedAppsForNotifications?: string[] | null;
  };
  config: {
    connectivities?: string[] | null;
    camera?: {
      resolutionMp: number;
      features?: string[] | null;
    } | null;
    chipset: string;
    memory: {
      ramBytes: number;
      storageBytes: number;
    };
    osId: string;
    compatiblePhoneOs?: string[] | null;
    appsConnect?: string[] | null;
    sensors?: string[] | null;
  };
  battery: {
    capacityMah: number;
    timeOnline: {
      aodOnMin: number;
      aodOffMin: number;
      typicalUsageMin?: number | null;
      standByMin?: number | null;
    };
    timeFullChargeMin: number;
    chargingType: string;
  };
  screen: {
    display: {
      diagonalSizeInch: number;
      displayType: string;
    };
    brightness: {
      minNits: number;
      maxNits: number;
    };
    resolution: {
      hPx: number;
      wPx: number;
    };
    glassMaterial: string;
    bezelMaterial: string;
    shape: string;
  } & (
    | {
        isCircular: true;
        diameterMm: number;
        dimension?: null;
      }
    | {
        isCircular: false;
        diameterMm?: null;
        dimension: {
          wMm: number;
          hMm: number;
          thicknessMm: number;
        };
      }
  );
  caseMaterial: string;
  watchWeightMg: number;
  compatibleBandLugWidthMm: number;
  releaseDate: string;
  stopSelling?: boolean;
};

export type ProductModelUpdate = DeepPartial<ProductModelCreate>;
export type ProductModelResponse = DeepNoneOptional<
  Omit<ProductModelCreate, "config"> & {
    config: Omit<ProductModelCreate["config"], "osId"> & {
      os: ProductOsResponse;
    };
  }
> & {
  id: string;
  productId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ProductModelListResponse = {
  models: {
    total: number;
    models: ProductModelResponse[];
  };
  offset: number;
  limit: number;
  total: number;
};

export type ModelVariationCreate = {
  name: string;
  color: {
    hex: string;
    name: string;
  };
  imageUrls?: string[] | null;
  additionalPriceCents?: number | null;
  band: {
    widthMm: number;
    lugWidthMm: number;
    material: string;
    colors: {
      hex: string;
      name: string;
    }[];
    claspType: string;
    adjustableRange: {
      minMm: number;
      maxMm: number;
    };
    style: string;
    quickRelease?: boolean;
    waterResistance?: boolean;
    hypoallergenic?: boolean;
    weightMg: number;
  };
  stopSelling?: boolean;
};
export type ModelVariationResponse = DeepNoneOptional<
  Omit<ModelVariationCreate, "imageUrls" | "additionalPriceCents">
> & {
  id: string;
  productModelId: string;
  imageUrls: string[];
  additionalPriceCents: number;
  stockQuantity: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stopSelling: boolean;
};
export type ModelVariationUpdate = DeepPartial<ModelVariationCreate>;
export type ModelVariationListResponse = {
  variations: {
    total: number;
    variations: ModelVariationResponse[];
  };
  offset: number;
  limit: number;
  total: number;
};

export type VariationInstanceCreate = {
  supplierSerialNumber: string;
  supplierImeiNumber?: string | null;
  conditionId?: string | null;
  isActive?: boolean;
};
export type VariationInstanceResponse = {
  id: string;
  sku: string;
  modelVariationId: string;
  supplierSerialNumber: string;
  supplierImeiNumber: string | null;
  conditionId: string;
  isActive: boolean;
  inactiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type VariationInstanceUpdate = Partial<VariationInstanceCreate>;

export type ProviderCreate = {
  fullName: string;
  email: string;
  phoneNumber: string;
};

export type ProviderResponse = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ProviderUpdate = Partial<ProviderCreate>;

export type StateResponse = {
  id: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
};

export type OrderCreate = {
  userAddressId: string;
  items: {
    variationId: string;
    quantity: number;
  }[];
  paymentMethodId: string;
  applyUserBalance?: boolean; // If true, use user's balance to discount the order
};
export type OrderUpdateFulfillItem = {
  items: {
    variationId: string;
    instanceIds: string[];
  }[];
};
export type OrderUpdateBase = Partial<{
  deliveryStateId: string;
  deliveryAddressId: string;
  estimateReceivedDate: string;
  stateId: string;
}>;
export type OrderUpdateSelf = Pick<
  OrderUpdateBase,
  "stateId" | "deliveryAddressId"
> & {
  buyerCancelReasonId?: string | null; // Must be provided when stateId is "canceled by buyer"
};
export type OrderUpdate = Pick<
  OrderUpdateBase,
  "deliveryStateId" | "estimateReceivedDate"
> & {
  notes: string | null; // For admin to note reason for update
};
export type OrderResponse = {
  id: string;
  userId: string;
  items: {
    variation: Pick<
      ModelVariationResponse,
      | "id"
      | "name"
      | "color"
      | "imageUrls"
      | "additionalPriceCents"
      | "stockQuantity"
      | "stopSelling"
    > & {
      isDeleted: boolean;
      productModel: Pick<
        ProductModelResponse,
        "id" | "name" | "priceCents" | "stopSelling"
      > & {
        isDeleted: boolean;
        product: Pick<ProductResponse, "id" | "name" | "stopSelling"> & {
          isDeleted: boolean;
        };
      };
    };
    quantity: number;
    totalCents: number;
    instances: {
      id: string;
      sku: string;
      state: (typeof ORDER_VARIATION_INSTANCE_STATES)[number]["name"];
    }[];
  }[];
  deliveryAddress: Omit<
    BaseUserAddress,
    "id" | "userId" | "isDefault" | "createdAt" | "updatedAt"
  >;
  transaction: {
    amountCents: number;
    currency: string;
    transactionDate: string;
    createdAt: string;
    paymentIntentId: string | null;
  } | null; // Order isn't paid yet (newly created), or paymentMethod is COD
  paymentSummary: {
    subtotalCents: number;
    appliedBalanceCents: number;
    finalAmountCents: number;
  };
  paymentMethodId: string;
  paymentStates: StateResponse[];
  deliveryStates: StateResponse[];
  states: StateResponse[]; // Order states history
  orderDate: string | null;
  estimateReceivedDate: string;
  receivedDate: string | null;
  fulfilledBy: string | null;
  fulfilledAt: string | null;
  buyerCancelReasonId: string | null;
  canReturn: boolean; // Based on receivedDate and return policy config
  createdAt: string;
  updatedAt: string;
};
export type OrderSearchQuery = Partial<{
  limit: string;
  offset: string;
  searchTerm: string; // Product/model/variation name, or order ID
  deliveryStateIds: string[];
  paymentStateIds: string[];
  stateIds: string[]; // Order state IDs
  userId: string; // For admin to search by user ID
}>;
export type OrderListResponse = {
  total: number;
  orders: {
    total: number;
    orders: OrderResponse[];
  };
  offset: number;
  limit: number;
};
export type OrderDetailResponse = Omit<
  OrderResponse,
  "paymentMethodId" | "paymentStates" | "deliveryStates" | "states"
> & {
  paymentMethod: Pick<PaymentMethodResponse, "id" | "name">;
  paymentStates: (StateResponse & { lookupId: string; name: string })[];
  deliveryStates: (StateResponse & {
    lookupId: string;
    name: string;
    level: number;
  })[];
  states: (StateResponse & { lookupId: string; name: string; level: number })[];
};

export type OrderStateResponse = {
  id: string;
  lookupId: string;
  name: string;
  level: number;
};
export type OrderStateListResponse = {
  total: number;
  states: OrderStateResponse[];
};

export type UserValidatePassword = {
  password: string;
};

export type ProductSearchQuery = Partial<{
  limit: string;
  offset: string;
  searchTerm: string;
  type: (typeof PRODUCT_TYPES)[number];
  brandId: string;
  categoryId: string;
  stopSelling: "true" | "false";
  priceCentsMin: string;
  priceCentsMax: string;
  sortBy: (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number];
}>;

export type ProductDetailQuery = Partial<{
  modelStopSelling: "true" | "false";
  variationStopSelling: "true" | "false";
}>;

export type PaymentMethodResponse = {
  id: string;
  lookupId: string;
  name: string;
  description: string | null;
};
export type PaymentMethodListResponse = {
  total: number;
  methods: PaymentMethodResponse[];
};

export type UserPaymentMethodResponse = {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserSelfPaymentMethodResponse = Omit<
  UserPaymentMethodResponse,
  "userId"
>;

export type UserSelfPaymentMethodListResponse = {
  total: number;
  methods: UserSelfPaymentMethodResponse[];
};

export type CheckoutSessionResponse = {
  url: string; // Redirect user to this URL to complete payment
};

export type DeliveryStateResponse = {
  id: string;
  lookupId: string;
  name: string;
  level: number;
};
export type DeliveryStateListResponse = {
  total: number;
  states: DeliveryStateResponse[];
};

export type PaymentStateResponse = {
  id: string;
  lookupId: string;
  name: string;
};
export type PaymentStateListResponse = {
  total: number;
  states: PaymentStateResponse[];
};

export type OrderReturnCreate = {
  reasonId: string;
  imageUrls?: string[] | null;
  buyerReason?: string | null;
  userAddressIdToPickup: string;
  estimatePickupDate?: string | null;
  items:
    | {
        variationId: string;
        instanceIds: string[];
      }[]
    | "all"; // "all" means return whole order
};
export type OrderReturnUpdateBase = Partial<{
  reasonId: string;
  imageUrls: string[] | null;
  buyerReason: string | null;
  userAddressIdToPickup: string;
  estimatePickupDate: string;
  pickupStateId: string;
  stateId: string;
}>;
export type OrderReturnUpdateSelf = Pick<
  OrderReturnUpdateBase,
  | "reasonId"
  | "imageUrls"
  | "buyerReason"
  | "userAddressIdToPickup"
  | "estimatePickupDate"
  | "stateId"
>;
export type OrderReturnUpdateState = {
  returnStateId: string;
  notes: string | null;
};
export type OrderReturnUpdatePickupState = Partial<{
  pickupStateId: string;
  estimatePickupDate: string; // Only for "pickup rescheduled" state
}> & {
  notes: string | null;
};
export type OrderReturnResponse = {
  id: string;
  orderId: string;
  items: Array<
    Omit<OrderResponse["items"][number], "instances"> & {
      instances: Array<
        Omit<OrderResponse["items"][number]["instances"][number], "state">
      >;
    }
  >;
  pickupAddress: OrderResponse["deliveryAddress"];
  transaction: {
    amountCents: number;
    currency: string;
    transactionDate: string;
    createdAt: string;
    paymentIntentId: string | null;
  } | null; // Return hasn't been refunded yet
  refundSummary: {
    toCardCents: number;
    toBalanceCents: number;
    finalRefundAmountCents: number;
  };
  refundStates: StateResponse[];
  pickupStates: StateResponse[];
  states: StateResponse[];
  pickupDate: string | null;
  estimatePickupDate: string;
  reasonId: string;
  imageUrls: string[];
  buyerReason: string | null;
  createdAt: string;
  updatedAt: string;
};
export type OrderReturnDetailResponse = Omit<
  OrderReturnResponse,
  "refundStates" | "pickupStates" | "states" | "reasonId"
> & {
  refundStates: (StateResponse & { lookupId: string; name: string })[];
  pickupStates: (StateResponse & {
    lookupId: string;
    name: string;
    level: number;
  })[];
  states: (StateResponse & { lookupId: string; name: string; level: number })[];
  reason: ReturnReasonResponse;
};
export type OrderReturnListResponse = {
  total: number;
  returns: {
    total: number;
    returns: OrderReturnResponse[];
  };
  offset: number;
  limit: number;
};
export type OrderReturnSearchQuery = Partial<{
  limit: string;
  offset: string;
  userId: string; // For admin to search by user ID
}>;

export type RefundStateResponse = PaymentStateResponse;
export type RefundStateListResponse = PaymentStateListResponse;

export type PickupStateResponse = DeliveryStateResponse;
export type PickupStateListResponse = DeliveryStateListResponse;

export type ReturnStateResponse = OrderStateResponse;
export type ReturnStateListResponse = OrderStateListResponse;

export type ReturnReasonResponse = {
  id: string;
  name: string;
  description: string | null;
};
export type ReturnReasonListResponse = {
  total: number;
  reasons: ReturnReasonResponse[];
};

export type StripeSetupIntentResponse = {
  clientSecret: string,
};

export type UserPaymentMethodCreate = {
  stripePaymentMethodId: string;
};

// --- HELPER TYPES ---
export type NoneOptional<T> = {
  [K in keyof T]-?: T[K];
};

/**
 * Helper type to check if a type is an array.
 */
type IsArray<T> = T extends Array<any> ? true : false;

/**
 * Helper type to check if a type is an object (but not an array).
 */
type IsObject<T> = T extends object
  ? T extends Array<any>
    ? false
    : true
  : false;

/**
 * Makes all properties of an object optional, including nested objects.
 * It correctly handles arrays, making the array itself optional but not its contents.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: IsArray<T[P]> extends true
    ? T[P]
    : IsObject<T[P]> extends true
    ? DeepPartial<T[P]>
    : T[P];
};

export type DeepNoneOptional<T> = {
  [K in keyof T]-?: T[K] extends object | undefined
    ? DeepNoneOptional<T[K]>
    : T[K];
};
