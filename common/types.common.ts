import type { CountryCode } from "libphonenumber-js";
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
  USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS,
  STRIPE_BANK_ACCOUNT_STATUS,
  BANK_ACCOUNT_TYPES,
  WITHDRAWAL_METHODS,
  USER_SEARCH_SORT_OPTIONS,
  PRODUCT_MODEL_SEARCH_SORT_OPTIONS,
  MODEL_VARIATION_SEARCH_SORT_OPTIONS,
  VARIATION_INSTANCE_SEARCH_SORT_OPTIONS,
  GRN_FILE_IMPORT_HEADERS,
  GRN_SEARCH_SORT_OPTIONS,
  PRODUCT_BRAND_SORT_OPTIONS,
  PRODUCT_CATEGORY_SORT_OPTIONS,
  PRODUCT_OS_SORT_OPTIONS,
  FIREBASE_STORAGE_BUCKET_NAMES,
  PROVIDER_SEARCH_SORT_OPTIONS,
  ROLE_SEARCH_SORT_OPTIONS,
  ORDER_SEARCH_SORT_OPTIONS,
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
export type CheckAdminAuthResponse = {
  admin: AdminUserResponse;
};

export type AdminUserResponse = UserResponse & {
  isLocked: boolean;
  roles: {
    id: string;
    assignedBy: string;
    assignedAt: string;
  }[];
};
export type AdminUserDetailsResponse = AdminUserResponse & {
  addresses: UserAddressListResponse;
  paymentMethods: UserSelfPaymentMethodListResponse;
  bankAccounts: UserBankAccountListResponse;
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
export type AdminUserLogin = {
  email: string;
  password: string;
};

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

export type UserEmailUpdate = Partial<{
  email: string | null;
  isEmailVerified: boolean;
}>;

export type UserPhoneNumberUpdate = Partial<{
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

export type UserSelfGeneralInfoUpdate = Omit<
  UserUpdate,
  "password" | "userBalanceCents" | "isLocked" | "roleIds"
>;

export type UserSelfPasswordUpdate = {
  currentPassword: string;
  newPassword: string;
};

// For user who auth by provider like Google, Facebook, etc.
export type UserSelfPasswordSet = {
  password: string;
};

export type GeoJSONPoint = {
  readonly locationType: "point";
  /** Represent [latitude, longitude] location for the address */
  coordinates: [number, number];
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

export type UserSelfAddressResponse = Omit<BaseUserAddress, "userId">;

export type UserAddressListResponse = {
  total: number;
  addresses: UserSelfAddressResponse[];
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
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
};

export type UserAddressUpdate = Partial<UserAddressCreate>;

export type AdminUserAddressResponse = UserSelfAddressResponse & {
  userId: string;
};
export type AdminUserAddressListResponse = {
  total: number;
  addresses: AdminUserAddressResponse[];
};

export type UserAddressFormat = Pick<
  BaseUserAddress,
  | "street"
  | "apartmentNumber"
  | "wardCode"
  | "districtCode"
  | "cityProvinceCode"
> & {
  countryCode: string;
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

export type OtpCreate = {
  type: VerifyType;
  userId: string;
};

export type UserContactInfoUpdate = {
  type: VerifyType;
  value: string;
};

export type PermissionCode = (typeof PERMISSION_LIST)[number]["code"];

export type PermissionResponse = {
  id: string;
  name: string;
  code: PermissionCode;
};

export type PermissionListResponse = {
  total: number;
  permissions: PermissionResponse[];
};

export type UserCreate = {
  fullName: string;
  avatarUrl?: string | null;
  email?: string | null;
  isEmailVerified?: boolean;
  phoneNumber?: string | null;
  isPhoneNumberVerified?: boolean;
  password: string;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  isLocked?: boolean;
  roleIds?: string[] | null;
};

export type UserBulkDelete = {
  userIds: string[];
};

export type UserSearchQuery = SearchQuery<
  (typeof USER_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    isEmailVerified: "true" | "false";
    isPhoneNumberVerified: "true" | "false";
    isLocked: "true" | "false";
  }>;

export type RoleResponse = {
  id: string;
  name: string;
  userAssigned: number;
  permissions: {
    id: string;
    assignedAt: string;
    assignedBy: string;
  }[];
  createdAt: string;
  updatedAt: string;
} & CreatedBy;

export type RoleDetailsResponse = Omit<RoleResponse, "permissions"> & {
  permissions: {
    total: number;
    permissions: (PermissionResponse & {
      assignedAt: string;
      assignedBy: CreatedBy["createdBy"];
    })[];
  };
};

export type RoleCreate = {
  name: string;
  permissionIds?: string[] | null;
};

export type RoleUpdate = Partial<RoleCreate>;

export type RoleListResponse = PaginatedResponse<"roles", RoleResponse>;

export type RoleResponseLight = {
  id: string;
  name: string;
  permissions: {
    id: string;
  }[];
};

export type RoleListResponseLight = {
  total: number;
  roles: RoleResponseLight[];
};

export type RoleSearchQuery = SearchQuery<
  (typeof ROLE_SEARCH_SORT_OPTIONS)[number]
>;

export type RoleBulkDelete = {
  roleIds: string[];
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

export type ProductBulkDelete = {
  productIds: string[];
};

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
export type AdminProductResponse = Omit<
  ProductResponse,
  "brand" | "category" | "createdBy"
> &
  CreatedBy & {
    brandId: string;
    categoryId: string;
    totalModels: number;
    totalVariations: number;
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
export type ProductDetailsResponse = ProductResponse & {
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

export type AdminProductDetailsResponse = Omit<
  AdminProductResponse,
  "brandId" | "categoryId"
> &
  Pick<ProductResponse, "brand" | "category"> & {
    models: {
      total: number;
      models: (AdminProductModelResponse & {
        variations: {
          total: number;
          variations: Omit<AdminModelVariationResponse, "productId">[];
        };
      })[];
    };
  };

export type ProductListResponse = PaginatedResponse<
  "products",
  ProductResponse
>;
export type AdminProductListResponse = PaginatedResponse<
  "products",
  AdminProductResponse
>;

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
export type ProductBrandListResponse = PaginatedResponse<
  "brands",
  ProductBrandResponse
>;

export type AdminProductBrandResponse = Omit<
  ProductBrandResponse,
  "createdBy"
> &
  CreatedBy;
export type AdminProductBrandListResponse = PaginatedResponse<
  "brands",
  AdminProductBrandResponse
>;

export type ProductBrandSearchQuery = SearchQuery<
  (typeof PRODUCT_BRAND_SORT_OPTIONS)[number]
>;

export type ProductBrandBulkDelete = {
  brandIds: string[];
};

export type ProductCategoryCreate = Omit<ProductBrandCreate, "logoUrl">;
export type ProductCategoryUpdate = Omit<ProductBrandUpdate, "logoUrl">;
export type ProductCategoryResponse = Omit<ProductBrandResponse, "logoUrl">;
export type ProductCategoryListResponse = PaginatedResponse<
  "categories",
  ProductCategoryResponse
>;

export type AdminProductCategoryResponse = Omit<
  ProductCategoryResponse,
  "createdBy"
> &
  CreatedBy;
export type AdminProductCategoryListResponse = PaginatedResponse<
  "categories",
  AdminProductCategoryResponse
>;

export type ProductCategorySearchQuery = SearchQuery<
  (typeof PRODUCT_CATEGORY_SORT_OPTIONS)[number]
>;

export type ProductCategoryBulkDelete = {
  categoryIds: string[];
};

export type ProductOsCreate = ProductBrandCreate;
export type ProductOsUpdate = ProductBrandUpdate;
export type ProductOsResponse = ProductBrandResponse;
export type ProductOsListResponse = PaginatedResponse<
  "oses",
  ProductOsResponse
>;

export type AdminProductOsResponse = Omit<ProductOsResponse, "createdBy"> &
  CreatedBy;
export type AdminProductOsListResponse = PaginatedResponse<
  "oses",
  AdminProductOsResponse
>;

export type ProductOsSearchQuery = SearchQuery<
  (typeof PRODUCT_OS_SORT_OPTIONS)[number]
>;

export type ProductOsBulkDelete = {
  osIds: string[];
};

export type ProductModelCreate = {
  productId: string;
  name: string;
  priceCents: number;
  stockPriceCents: number;
  imageUrls?: string[] | null;
  feature: {
    speakerAndMicrophone?: boolean;
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
    refreshRateHz?: number | null;
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

export type ProductModelUpdate = DeepPartial<
  Omit<ProductModelCreate, "productId">
>;

export type ProductModelResponse = DeepNonePartial<
  Omit<
    ProductModelCreate,
    "imageUrls" | "feature" | "config" | "stockPriceCents" | "stopSelling"
  > & {
    feature: Omit<
      ProductModelCreate["feature"],
      "utilities" | "supportedAppsForNotifications"
    > & {
      utilities: {
        healths: string[];
        sports: string[];
        specials: string[];
        others: string[];
      } | null;
      supportedAppsForNotifications: string[];
    };
  } & {
    config: Pick<ProductModelCreate["config"], "chipset" | "memory"> & {
      connectivities: string[];
      camera: {
        resolutionMp: number;
        features: string[];
      } | null;
      os: ProductOsResponse;
      compatiblePhoneOs: string[];
      appsConnect: string[];
      sensors: string[];
    };
  }
> & {
  id: string;
  productId: string;
  imageUrls: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stopSelling: boolean;
};

export type AdminProductModelResponse = Omit<
  ProductModelResponse,
  "createdBy"
> &
  Pick<AdminProductResponse, "createdBy"> & {
    stockPriceCents: number;
    totalVariations: number;
  };

// With list we replace config.os by osId only to reduce payload size
export type AdminProductModelResponseForList = Omit<
  AdminProductModelResponse,
  "config"
> & {
  config: DeepNonePartial<ProductModelCreate["config"]>;
};

export type AdminProductModelListResponse = PaginatedResponse<
  "models",
  AdminProductModelResponseForList
>;

export type AdminProductModelDetailsResponse = Omit<
  AdminProductModelResponse,
  "totalVariations"
> & {
  variations: {
    total: number;
    variations: Omit<AdminModelVariationResponse, "productId">[];
  };
};

export type ProductModelListResponse = PaginatedResponse<
  "models",
  ProductModelResponse
>;

export type ProductModelSearchQuery = SearchQuery<
  (typeof PRODUCT_MODEL_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    priceCentsMin: string;
    priceCentsMax: string;
    stockPriceCentsMin: string;
    stockPriceCentsMax: string;
    releaseDateFrom: string;
    releaseDateTo: string;
    stopSelling: "true" | "false";
  }>;

export type ProductModelDetailQuery = Pick<
  ProductDetailQuery,
  "variationStopSelling"
>;

export type ProductModelBulkDelete = {
  modelIds: string[];
};

export type ModelVariationCreate = {
  productModelId: string;
  name: string;
  color: {
    hex: string;
    name: string;
  };
  imageUrls?: string[] | null;
  additionalPriceCents?: number | null;
  stockAdditionalPriceCents?: number | null;
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

export type ModelVariationResponse = DeepNonePartial<
  Omit<
    ModelVariationCreate,
    | "imageUrls"
    | "additionalPriceCents"
    | "stockAdditionalPriceCents"
    | "stopSelling"
  >
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
export type AdminModelVariationResponse = Omit<
  ModelVariationResponse,
  "createdBy"
> &
  Pick<AdminProductResponse, "createdBy"> & {
    productId: string;
    stockAdditionalPriceCents: number;
  };

export type AdminModelVariationListResponse = PaginatedResponse<
  "variations",
  AdminModelVariationResponse
>;
export type ModelVariationUpdate = DeepPartial<
  Omit<ModelVariationCreate, "productModelId">
>;
export type ModelVariationListResponse = PaginatedResponse<
  "variations",
  ModelVariationResponse
>;

export type ModelVariationSearchQuery = SearchQuery<
  (typeof MODEL_VARIATION_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    additionalPriceCentsMin: string;
    additionalPriceCentsMax: string;
    stockAdditionalPriceCentsMin: string;
    stockAdditionalPriceCentsMax: string;
    stopSelling: "true" | "false";
  }>;

export type ModelVariationBulkDelete = {
  variationIds: string[];
};

export type VariationInstanceCreate = {
  modelVariationId: string;
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
export type VariationInstanceListResponse = PaginatedResponse<
  "instances",
  VariationInstanceResponse
>;
export type VariationInstanceUpdate = Partial<
  Omit<VariationInstanceCreate, "modelVariationId">
>;
export type VariationInstanceSearchQuery = SearchQuery<
  (typeof VARIATION_INSTANCE_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    conditionId: string;
    isActive: "true" | "false";
  }>;
export type AdminVariationInstanceDetailsResponse =
  VariationInstanceResponse & {
    // modelVariation: Omit<AdminModelVariationResponse, "productId">;
    inventoryMovements: {
      total: number;
      movements: Omit<
        InventoryMovementDetailsResponse,
        "variationInstanceId" | "variationInstanceSku"
      >[];
    };
  };

export type InstanceConditionResponse = {
  id: string;
  lookupId: string;
  name: string;
  description: string;
};
export type InstanceConditionListResponse = {
  total: number;
  conditions: InstanceConditionResponse[];
};

export type ProviderAddressCreate = {
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  locality: string;
  adminAreaL1: string;
  adminAreaL2?: string | null;
  postalCode: string;
  phoneNumber: string;
  location: {
    latitude: number;
    longitude: number;
  };
  notes?: string | null;
  isDefault?: boolean;
};

export type ProviderAddressUpdate = Partial<ProviderAddressCreate>;

export type ProviderAddressResponse = NoneOptional<
  Omit<ProviderAddressCreate, "location">
> & {
  id: string;
  location: GeoJSONPoint;
  createdAt: string;
  updatedAt: string;
} & CreatedBy;

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
  createdAt: string;
  updatedAt: string;
} & CreatedBy;

export type ProviderDetailsResponse = ProviderResponse & {
  addresses: {
    total: number;
    addresses: ProviderAddressResponse[];
  };
};

export type ProviderListResponse = PaginatedResponse<
  "providers",
  ProviderResponse
>;

export type ProviderUpdate = Partial<ProviderCreate>;

export type ProviderSearchQuery = SearchQuery<
  (typeof PROVIDER_SEARCH_SORT_OPTIONS)[number]
>;

export type ProviderBulkDelete = {
  providerIds: string[];
};

export type ProviderResponseLight = Pick<ProviderResponse, "id" | "fullName">;

export type ProviderListResponseLight = {
  total: number;
  providers: ProviderResponseLight[];
};

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

export type OrderFulfillItemUpdate = {
  items: {
    variationId: string;
    instanceIds: string[];
  }[];
};

export type OrderBaseUpdate = Partial<{
  deliveryStateId: string;
  deliveryAddressId: string;
  estimateReceivedDate: string;
  stateId: string;
}>;

export type OrderSelfUpdate = Pick<
  OrderBaseUpdate,
  "stateId" | "deliveryAddressId"
> & {
  buyerCancelReasonId?: string | null; // Must be provided when stateId is "canceled by buyer"
};

export type OrderUpdate = Pick<
  OrderBaseUpdate,
  "deliveryStateId" | "estimateReceivedDate"
> & {
  notes?: string | null; // Notes for delivery state update
};

export type OrderUpdateBulk = {
  orderIds: string[];
  deliveryStateId?: string;
  notes?: string | null; // Notes for delivery state update
  estimateReceivedDate?: string;
};

export type InstanceState = (typeof ORDER_VARIATION_INSTANCE_STATES)[number]["name"];

export type OrderResponse = {
  id: string;
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
      state: InstanceState;
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
  buyerCancelReasonId: string | null;
  canReturn: boolean; // Based on receivedDate and return policy config
  createdAt: string;
  updatedAt: string;
} & (
  | {
      fulfilledBy: string;
      fulfilledAt: string;
    }
  | {
      fulfilledBy: null;
      fulfilledAt: null;
    }
);

export type AdminOrderResponse = OrderResponse & {
  orderedBy: CreatedBy["createdBy"];
};

export type OrderSearchQuery = SearchQuery &
  Partial<{
    deliveryStateIds: string[];
    paymentStateIds: string[];
    stateIds: string[]; // Order state IDs
  }>;

export type AdminOrderSearchQuery = SearchQuery<
  (typeof ORDER_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    deliveryStateIds: string[];
    paymentStateIds: string[];
    paymentMethodIds: string[];
    stateIds: string[]; // Order state IDs
    orderedBy: string;
    canReturn: "true" | "false";

    orderDateFrom: string;
    orderDateTo: string;

    estimateReceivedDateFrom: string;
    estimateReceivedDateTo: string;

    receivedDateFrom: string;
    receivedDateTo: string;

    createdAtFrom: string;
    createdAtTo: string;

    updatedAtFrom: string;
    updatedAtTo: string;
  }>;

export type OrderListResponse = PaginatedResponse<"orders", OrderResponse>;

export type AdminOrderListResponse = PaginatedResponse<
  "orders",
  AdminOrderResponse
>;

export type OrderDetailsResponse = Omit<
  OrderResponse,
  | "paymentMethodId"
  | "paymentStates"
  | "deliveryStates"
  | "states"
  | "buyerCancelReasonId"
> & {
  paymentMethod: Pick<PaymentMethodResponse, "id" | "name">;
  paymentStates: (StateResponse & { lookupId: string; name: string })[];
  deliveryStates: (StateResponse & {
    lookupId: string;
    name: string;
    level: number;
  })[];
  states: (StateResponse & { lookupId: string; name: string; level: number })[];
  buyerCancelReason: {
    id: string;
    name: string;
    description: string | null;
  } | null;
};

export type AdminOrderDetailsResponse = Omit<
  OrderDetailsResponse,
  "fulfilledBy" | "fulfilledAt"
> & {
  orderedBy: CreatedBy["createdBy"];
} & (
    | {
        fulfilledBy: CreatedBy["createdBy"];
        fulfilledAt: string;
      }
    | {
        fulfilledBy: null;
        fulfilledAt: null;
      }
  );

export type OrderStateResponse = {
  id: string;
  lookupId: string;
  name: string;
  level: number;
  description: string | null;
};

export type OrderStateListResponse = {
  total: number;
  states: OrderStateResponse[];
};

export type UserValidatePassword = {
  password: string;
};

export type ProductSearchQuery = SearchQuery<
  (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    type: (typeof PRODUCT_TYPES)[number];
    brandIds: string[];
    categoryIds: string[];
    stopSelling: "true" | "false";
    priceCentsMin: string;
    priceCentsMax: string;
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

export type DeliveryStateResponse = OrderStateResponse;
export type DeliveryStateListResponse = {
  total: number;
  states: DeliveryStateResponse[];
};

export type PaymentStateResponse = {
  id: string;
  lookupId: string;
  name: string;
  description: string | null;
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
export type OrderReturnBaseUpdate = Partial<{
  reasonId: string;
  imageUrls: string[] | null;
  buyerReason: string | null;
  userAddressIdToPickup: string;
  estimatePickupDate: string;
  pickupStateId: string;
  stateId: string;
}>;
export type OrderReturnSelfUpdate = Pick<
  OrderReturnBaseUpdate,
  | "reasonId"
  | "imageUrls"
  | "buyerReason"
  | "userAddressIdToPickup"
  | "estimatePickupDate"
  | "stateId"
>;
export type OrderReturnStateUpdate = {
  returnStateId: string;
  notes: string | null;
};
export type OrderReturnPickupStateUpdate = Partial<{
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
  refundTransaction: {
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
export type OrderReturnDetailsResponse = Omit<
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
export type OrderReturnListResponse = PaginatedResponse<
  "returns",
  OrderReturnResponse
>;
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
  clientSecret: string;
};

export type UserPaymentMethodCreate = {
  stripePaymentMethodId: string;
};

export type UserBalanceHistorySearchQuery = Partial<{
  limit: string;
  offset: string;
  category: (typeof USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS)[number];
  createdAtFrom: string; // ISO date string
  createdAtTo: string; // ISO date string
}>;

export type UserBalanceHistoryResponse = {
  type: "refund" | "withdraw_request" | "payment_to";
  referenceId: string;
  balanceCentsUsed: number;
  state: "completed" | "pending" | "failed"; // For display only
  createdAt: string;
};
export type UserBalanceHistoryListResponse = PaginatedResponse<
  "histories",
  UserBalanceHistoryResponse
>;

export type UserBankAccountSetupResponse = {
  bankAccountId: string;
  setupUrl: string; // onboardingUrl
  accountStatus: (typeof STRIPE_BANK_ACCOUNT_STATUS)[number];
};

export type UserSelfBankAccountResponse = {
  id: string;
  accountHolderName: string;
  last4: string;
  bankName: string;
  routingNumber: string | null;
  accountType: (typeof BANK_ACCOUNT_TYPES)[number];
  currency: string;
  country: string;
  isVerified: boolean;
  isDefault: boolean;
  accountStatus: (typeof STRIPE_BANK_ACCOUNT_STATUS)[number];
  requiresAction: boolean;
  createdAt: string;
  updatedAt: string;
};
type UserBankAccountResponse = UserSelfBankAccountResponse & {
  stripeConnectedAccountId: string;
  stripeBankAccountFingerprint: string | null;
};
export type UserSelfBankAccountListResponse = {
  total: number;
  accounts: UserSelfBankAccountResponse[];
};
type UserBankAccountListResponse = {
  total: number;
  accounts: UserBankAccountResponse[];
};

export type WithdrawalRequestCreate = {
  amountCents: number;
  bankAccountId: string;
};

export type SelfWithdrawalRequestResponse = {
  id: string;
  amountCents: number;
  currency: string;
  states: StateResponse[];
  withdrawalMethod: (typeof WITHDRAWAL_METHODS)[number];
  stripeTransferGroupId: string | null;
  stripeTransferId: string | null;
  bankAccount: {
    stripeConnectedAccountId: string;
    accountHolderName: string;
    last4: string;
    bankName: string;
  };
  failureReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SelfWithdrawalRequestListResponse = PaginatedResponse<
  "requests",
  SelfWithdrawalRequestResponse
>;

export type SelfWithdrawalRequestSearchQuery = Partial<{
  limit: string;
  offset: string;
}>;

export type ApproveWithdrawalRequest =
  | {
      notes?: string | null;
    }
  | undefined;
export type RejectWithdrawalRequest = ApproveWithdrawalRequest;

export type WithdrawalStateResponse = OrderStateResponse;
export type WithdrawalStateListResponse = {
  total: number;
  states: WithdrawalStateResponse[];
};

export type InventoryMovementResponse = {
  id: string;
  variationInstanceId: string;
  variationInstanceSku: string;
  inventoryMovementTypeId: string;
  grnId: string | null;
  movementDate: string;
  quantity: 1 | -1;
  notes: string | null;
  createdAt: string;
} & CreatedBy;

export type InventoryMovementDetailsResponse = Omit<
  InventoryMovementResponse,
  "grnId"
> & {
  grn:
    | (Pick<GrnResponse, "id" | "name"> & {
        provider: Pick<ProviderResponse, "id" | "fullName">;
      })
    | null;
};

export type GrnCreate = {
  modelVariationId: string;
  providerId: string;
  grn: {
    name: string;
    totalPriceCents: number;
    quantity: number;
    notes?: string | null;
    stateId?: string | null;
  };
  file: File; // .xlsx, .xls, .csv file containing stock import data
};

// For GRN creation at server side after processing
export type GrnCreateReceived = Omit<GrnCreate, "file"> & {
  instances: {
    [K in (typeof GRN_FILE_IMPORT_HEADERS)[number]]: K extends "supplierSerialNumber"
      ? string
      : string | null | undefined;
  }[];
};

export type GrnResponse = CreatedBy & {
  id: string;
  name: string;
  providerId: string;
  totalPriceCents: number;
  quantity: number;
  notes: string | null;
  stateId: string;
  createdAt: string;
  reversedByGrnId: string | null;
  reversedAt: string | null;
};

export type GrnStateResponse = OrderStateResponse;

export type GrnStateListResponse = {
  total: number;
  states: GrnStateResponse[];
};

// Because GrnDetailsResponse will return a list of "grn" with "total" so we need this type to avoid confusion
export type GrnDetailsItem = Omit<GrnResponse, "providerId"> & {
  provider: Pick<ProviderResponse, "id" | "fullName">;
};

export type GrnDetailsResponse = {
  total: number;
  grns: GrnDetailsItem[];
};

export type GrnListResponse = PaginatedResponse<"grns", GrnDetailsItem>;

export type GrnSearchQuery = SearchQuery<
  (typeof GRN_SEARCH_SORT_OPTIONS)[number]
> &
  Partial<{
    totalPriceCentsMin: string;
    totalPriceCentsMax: string;
    createdAtFrom: string;
    createdAtTo: string;
    stateId: string;
  }>;

export type GrnUpdate = Partial<
  Pick<GrnResponse, "name" | "providerId" | "totalPriceCents" | "stateId"> & {
    notes: string | null;
  }
> & {
  inventoryMovement: {
    typeId: string;
    quantity: 1 | -1;
    notes?: string | null;
  };
};

export type GenSkuProps = {
  productName: string;
  modelName: string;
  variationColor: string;
};

export type InventoryMovementTypeResponse = {
  id: string;
  lookupId: string;
  name: string;
  description: string | null;
};

export type InventoryMovementTypeListResponse = {
  total: number;
  types: InventoryMovementTypeResponse[];
};

export type FirebaseBucket = (typeof FIREBASE_STORAGE_BUCKET_NAMES)[number];

export type CountryListEntry = {
  code: CountryCode;
  name: string;
  dialCode: string;
};

export type OrderCancelReasonResponse = {
  id: string;
  name: string;
  description: string | null;
};

export type OrderCancelReasonListResponse = {
  total: number;
  reasons: OrderCancelReasonResponse[];
};

export type SortOption = "asc" | "desc";

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

export type DeepNonePartial<T> = {
  [K in keyof T]-?: T[K] extends object | undefined
    ? DeepNonePartial<T[K]>
    : T[K];
};

export type CreatedBy = {
  createdBy: {
    id: string;
    fullName: string;
  };
};

type PaginatedResponse<K extends string = "items", T = any> = {
  total: number;
  offset: number;
  limit: number;
} & {
  [P in K]: {
    total: number;
  } & {
    [P in K]: T[];
  };
};

type SearchQuery<SortBy extends string | undefined = undefined> = Partial<{
  limit: string;
  offset: string;
  searchTerm: string;
  sortBy: SortBy;
}>;

export type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};
