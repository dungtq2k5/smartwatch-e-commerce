import { PERMISSION_LIST } from "../server/configs/configs";
import { USER_GENDER_OPTIONS, AUTH_PROVIDER_OPTIONS } from "./configs.common";

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
  readonly type: "Point";
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
  avatarUrl?: string;
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
};

export type ProductListResponse = {
  total: number;
  products: ProductResponse[];
  offset: number;
  limit: number;
};

export type ProductBrandCreate = {
  name: string;
};

export type ProductBrandUpdate = Partial<ProductBrandCreate>;

export type ProductBrandResponse = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
export type ProductBrandListResponse = {
  total: number;
  brands: ProductBrandResponse[];
  offset: number;
  limit: number;
};

export type ProductCategoryCreate = ProductBrandCreate;
export type ProductCategoryUpdate = Partial<ProductCategoryCreate>;
export type ProductCategoryResponse = ProductBrandResponse;
export type ProductCategoryListResponse = {
  total: number;
  categories: ProductCategoryResponse[];
  offset: number;
  limit: number;
};

export type ProductOsCreate = ProductBrandCreate;
export type ProductOsUpdate = Partial<ProductOsCreate>;
export type ProductOsResponse = ProductBrandResponse;
export type ProductOsListResponse = {
  total: number;
  osList: ProductOsResponse[];
  offset: number;
  limit: number;
};

export type ProductModelCreate = {
  model: string;
  name: string;
  watchSizeMm: number;
  priceCents: number;
  basePriceCents: number;
  imageUrls?: string[];
  displaySizeMm: number;
  displayType: string;
  resolutionHPx: number;
  resolutionWPx: number;
  ramBytes: number;
  romBytes: number;
  osId: string;
  connectivities: string[];
  batteryLifeMah: number;
  waterResistanceValue: number;
  waterResistanceUnit: string;
  sensors: string[];
  caseMaterial: string;
  weightMg: number;
  releaseDate?: string;
  stopSelling?: boolean;
};

export type ProductModelUpdate = Partial<ProductModelCreate>;

export type ProductModelResponse = NoneOptional<ProductModelCreate> & {
  id: string;
  productId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BaseModelVariationCreate = {
  name: string;
  colorHex: string;
  imageUrls?: string[];
  stopSelling?: boolean;
};

export type ModelVariationColor = {
  additionalPriceCents?: number;
};

export type ModelVariationBand = {
  material: string;
  sizeMm: number;
  weightMg: number;
  priceCents: number;
  basePriceCents: number;
};

export type ModelVariationCreate<T = ModelVariationColor | ModelVariationBand> =
  BaseModelVariationCreate & T;

export type ModelVariationResponse = NoneOptional<BaseModelVariationCreate> & {
  id: string;
  productModelId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stopSelling: boolean;
} & (
    | (NoneOptional<ModelVariationColor> & { type: "color" })
    | (NoneOptional<ModelVariationBand> & { type: "band" })
  );

export type ModelVariationUpdate<T = ModelVariationColor | ModelVariationBand> =
  Partial<BaseModelVariationCreate> & Partial<T>;

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

// --- HELPER TYPES ---
export type NoneOptional<T> = {
  [K in keyof T]-?: T[K];
};
