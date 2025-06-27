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
  users: AdminUserResponse[];
  total: number;
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
  roles: RoleResponse[];
  total: number;
};

export type RoleUpdate = {
  name?: string;
  permissionIds?: string[];
};

// --- HELPER TYPES ---
export type Optional<T> = {
  [K in keyof T]?: T[K];
};
