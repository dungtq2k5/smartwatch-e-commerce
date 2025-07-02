import { PERMISSION_LIST } from "../server/configs/configs";

export type ErrorResponse = {
  readonly success: false;
  message: string;
};

export type SuccessResponse<T = any> = {
  readonly success: true;
  message?: string;
  data?: T;
};

type BaseUserResponse = {
  id: string;
  fullName: string;
  avatarUrl?: string;
  email?: string;
  isEmailVerified: boolean;
  phoneNumber?: string;
  isPhoneNumberVerified: boolean;
  stripeCustomerId?: string;
  userBalanceCents: number;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
};

type UserWithEmailOnly = {
  email: string;
  phoneNumber: undefined;
};
type UserWithPhoneNumberOnly = {
  email: undefined;
  phoneNumber: string;
};

type UserWithBothEmailAndPhoneNumber = {
  email: string;
  phoneNumber: string;
};

export type UserResponse = BaseUserResponse &
  (
    | UserWithEmailOnly
    | UserWithPhoneNumberOnly
    | UserWithBothEmailAndPhoneNumber
  );

export type AdminUserResponse = BaseUserResponse & {
  isLocked: boolean;
};

export type AdminUserListResponse = {
  total: number;
  users: AdminUserResponse[];
  offset: number;
  limit: number;
};

export type UserSignup = {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  password: string;
} & (
  | { email: string; phoneNumber?: undefined }
  | { email?: undefined; phoneNumber: string }
);

export type UserLogin = {
  email?: string;
  phoneNumber?: string;
  password: string;
} & (
  | { email: string; phoneNumber?: undefined }
  | { email?: undefined; phoneNumber: string }
);

export type UserVerify = {
  userId: string;
  type: "email" | "phoneNumber";
  code: string;
};

export type UserAuthByGoogle = {
  idToken: string;
};

export type UserForgotPassword =
  | {
      email: string;
      phoneNumber: undefined;
    }
  | {
      email: undefined;
      phoneNumber: string;
    };

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
  userBalanceCents?: number;
  isLocked?: boolean;
  roleIds?: string[];
};

export type BaseUserAddress = {
  id: string;
  name: string;
  userId: string;
  street: string;
  apartmentNumber: string;
  ward: string;
  district: string;
  cityProvince: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserAddressResponse = Omit<BaseUserAddress, "userId">;

export type UserAddressResponseList = {
  addresses: UserAddressResponse[];
  total: number;
};

export type UserAddressCreate = Omit<
  BaseUserAddress,
  "id" | "userId" | "createdAt" | "updatedAt" | "isDefault"
> & { isDefault?: boolean };

export type UserAddressUpdate = Optional<UserAddressCreate>;

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
  carts: UserCartResponse[];
  total: number;
};

export type UserCartCreate = {
  variationId: string;
  quantity?: number;
};

export type CreateOtp = {
  type: "email" | "phoneNumber";
  userId: string;
};

export type UserUpdateContactInfo = {
  type: "email" | "phoneNumber";
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
  userBalanceCents?: number;
  isLocked?: boolean;
  roleIds?: string[];
} & (
  | { email: string; phoneNumber?: undefined }
  | { email?: undefined; phoneNumber: string }
);

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

export type ProductUpdate = Optional<ProductCreate>;

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

export type ProductBrandUpdate = Optional<ProductBrandCreate>;

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
export type ProductCategoryUpdate = Optional<ProductCategoryCreate>;
export type ProductCategoryResponse = ProductBrandResponse;
export type ProductCategoryListResponse = {
  total: number;
  categories: ProductCategoryResponse[];
  offset: number;
  limit: number;
};

export type ProductOsCreate = ProductBrandCreate;
export type ProductOsUpdate = Optional<ProductOsCreate>;
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

export type ProductModelUpdate = Optional<ProductModelCreate>;

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
  Optional<BaseModelVariationCreate> & Optional<T>;

// --- HELPER TYPES ---
export type Optional<T> = {
  [K in keyof T]?: T[K];
};

export type NoneOptional<T> = {
  [K in keyof T]-?: T[K];
};
