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
  avatarUrl: string | null;
  email: string | null;
  isEmailVerified: boolean;
  phoneNumber: string | null;
  isPhoneNumberVerified: boolean;
  stripeCustomerId: string | null;
  userBalanceCents: number;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserWithEmailOnly = {
  email: string;
  phoneNumber: null;
};
type UserWithPhoneNumberOnly = {
  email: null;
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
