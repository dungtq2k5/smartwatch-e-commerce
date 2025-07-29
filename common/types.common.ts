import { PERMISSION_LIST } from "../server/configs/configs";
import { USER_GENDER_OPTIONS, AUTH_PROVIDER_OPTIONS, PRODUCT_SEARCH_SORT_OPTIONS } from "./configs.common";

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
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneNumberVerified: boolean;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  stripeCustomerId?: string;
  userBalanceCents: number;
  authProvider: (typeof AUTH_PROVIDER_OPTIONS)[number];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
};

export type UserResponse = BaseUserResponse &
  (
    | EmailOrPhoneNumber
    | {
        email: string;
        phoneNumber: string;
      }
  );

export type CheckAuthResponse = {
  user: UserResponse;
  isAuth: boolean;
};

export type AdminUserResponse = BaseUserResponse & {
  isLocked: boolean;
};

export type AdminUserListResponse = {
  total: number;
  users: AdminUserResponse[];
  offset: number;
  limit: number;
};

export type EmailOrPhoneNumber =
  | {
      email: string;
      phoneNumber: undefined;
    }
  | {
      email: undefined;
      phoneNumber: string;
    };

export type UserSignup = {
  fullName: string;
  // email?: string;
  // phoneNumber?: string;
  password: string;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
} & EmailOrPhoneNumber;

export type UserLogin = {
  // email?: string;
  // phoneNumber?: string;
  password: string;
} & EmailOrPhoneNumber;

export type VerifyType = "email" | "phoneNumber";

export type UserVerify = {
  type: VerifyType;
  code: string;
};

export type UserAuthByGoogle = {
  idToken: string;
  accessToken: string; // To user sensitive data like birth, gender, etc.
};

export type UserForgotPassword = EmailOrPhoneNumber;

export type UserUpdateEmail = {
  email?: string | null;
  isEmailVerified?: boolean;
};

export type UserUpdatePhoneNumber = {
  phoneNumber?: string | null;
  isPhoneNumberVerified?: boolean;
};

export type UserUpdate = {
  fullName?: string;
  avatarUrl?: string | null;
  password?: string;
  birth?: string;
  gender?: (typeof USER_GENDER_OPTIONS)[number];
  userBalanceCents?: number;
  isLocked?: boolean;
  roleIds?: string[];
};

export type UserUpdateSelfGeneralInfo = Omit<
  UserUpdate,
  "password" | "userBalanceCents" | "isLocked" | "roleIds"
>;

export type UserUpdateSelfPassword = {
  currentPassword: string;
  newPassword: string;
};

export type UserSetSelfPassword = { // For user who auth by Google
  password: string;
}

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
  countryCode?: string;
  location: GeoJSONPoint;
  phoneNumber: string;
  fullAddress: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserAddressResponse = Omit<BaseUserAddress, "userId">;

export type UserAddressResponseList = {
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

export type UserCartResponse = Omit<BaseUserCart, "userId">;

export type UserCartResponseList = {
  total: number;
  carts: UserCartResponse[];
};

export type UserCartCreate = {
  variationId: string;
  quantity?: number;
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
  email?: string;
  isEmailVerified?: boolean;
  phoneNumber?: string;
  isPhoneNumberVerified?: boolean;
  password: string;
  birth: string;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  userBalanceCents?: number;
  isLocked?: boolean;
  roleIds?: string[];
} & EmailOrPhoneNumber;

export type RoleCreate = {
  name: string;
  permissionIds?: string[];
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
  permissionIds?: string[];
};

export type ProductCreate = {
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  imageUrls?: string[];
  stopSelling?: boolean;
  basePriceCents: number;
};

export type ProductUpdate = Partial<ProductCreate>;

export type ProductResponse = {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  imageUrls: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stopSelling: boolean;
  basePriceCents: number;
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
  logoUrl?: string;
  description?: string;
};

export type ProductBrandUpdate = {
  name?: string;
  logoUrl?: string | null;
  description?: string | null;
};

export type ProductBrandResponse = {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
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
  osList: {
    total: number;
    osList: ProductOsResponse[];
  };
  offset: number;
  limit: number;
  total: number;
};

export type ProductModelCreate = {
  model: string;
  name: string;
  watchSizeMm: number;
  priceCents: number;
  stockPriceCents: number;
  imageUrls?: string[];
  display: {
    sizeMm: number;
    displayType: string;
  };
  resolution: {
    hPx: number;
    wPx: number;
  };
  memory: {
    ramBytes: number;
    romBytes: number;
  };
  osId: string;
  chipset: string;
  connectivities: string[];
  batteryLifeMah: number;
  waterResistance?: string | null;
  sensors: string[];
  caseMaterial: string;
  weightMg: number;
  compatibleBandLugWidthMm: number;
  releaseDate?: string;
  stopSelling?: boolean;
};

export type ProductModelUpdate = DeepPartial<ProductModelCreate>;
export type ProductModelResponse = DeepNoneOptional<ProductModelCreate> & {
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
  colorHex: string;
  imageUrls?: string[];
  additionalPriceCents?: number;
  band: {
    lugWidthMm: number;
    material: string;
    colorsHex: string[];
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
export type ModelVariationResponse = DeepNoneOptional<ModelVariationCreate> & {
  id: string;
  productModelId: string;
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
  supplierImeiNumber?: string;
  conditionId?: string;
  isActive?: boolean;
};

export type VariationInstanceResponse = {
  id: string;
  sku: string;
  modelVariationId: string;
  supplierSerialNumber: string;
  supplierImeiNumber?: string;
  conditionId: string;
  isActive: boolean;
  inactiveAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type VariationInstanceUpdate = Omit<
  Partial<VariationInstanceCreate>,
  "supplierImeiNumber"
> & {
  supplierImeiNumber?: string | null;
};

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

export type OrderCreate = {
  userAddressId: string;
  items: {
    variationId: string;
    quantity: number;
  }[];
};

export type OrderResponse = {
  id: string;
  userId: string;
  items: {
    variationId: string;
    quantity: number;
    totalCents: number;
    instanceIds: {
      id: string;
      sku: string;
    }[];
  }[];
  totalCents: number;
  deliveryStateId: string;
  estimateReceivedDate: string;
  receivedDate?: string;
  deliveryAddress: Omit<
    BaseUserAddress,
    "id" | "userId" | "isDefault" | "createdAt" | "updatedAt"
  >;
  createdAt: string;
  updatedAt: string;
};

export type OrderUpdate = {
  deliveryStateId?: string;
  estimateReceivedDate?: string;
  deliveryAddressId?: string;
};

export type UserValidatePassword = {
  password: string;
};

export type ProductSearchQuery = Partial<{
  limit: string;
  offset: string;
  searchTerm: string;
  brandId: string;
  categoryId: string;
  stopSelling: "true" | "false";
  priceCentsMin: string;
  priceCentsMax: string;
  sortBy: (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number];
}>;

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