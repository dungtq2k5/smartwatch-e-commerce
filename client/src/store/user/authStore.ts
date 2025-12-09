import { create } from "zustand";
import type {
  UserResponse,
  UserSignup,
  UserVerify,
  UserLogin,
  CheckAuthResponse,
  UserForgotPassword,
  UserAuthByGoogle,
  UserSelfGeneralInfoUpdate,
  UserContactInfoUpdate,
  UserSelfPasswordUpdate,
  UserSelfPasswordSet,
} from "../../../../common/types.common";
import { post, patch, retrieve, remove } from "../../utils/utils";
import {
  AUTH_BY_GOOGLE_URL,
  CHECK_AUTH_URL,
  FORGOT_PASSWORD_URL,
  LOGIN_URL,
  RESET_PASSWORD_URL,
  USER_UPDATE_SELF_GENERAL_INFO_URL,
  SIGNUP_URL,
  VERIFY_USER_URL,
  USER_UPDATE_SELF_CONTACT_INFO_URL,
  USER_UPDATE_SELF_PASSWORD_URL,
  USER_SET_SELF_PASSWORD_URL,
  LOGOUT_URL,
  USER_DELETE_ACCOUNT_URL,
} from "../../configs";
import { formatError } from "../../../../common/utils.common";

type AuthState = {
  user: UserResponse | null;
  isAuth: boolean; // If this is true, user data must be defined

  // Validate and authenticate user
  checkAuth: () => Promise<boolean>;

  signup: (user: UserSignup) => Promise<UserResponse>;

  verify: (data: UserVerify) => Promise<UserResponse>;

  login: (data: UserLogin) => Promise<UserResponse>;
  logout: () => Promise<void>;

  authByGoogle: (data: UserAuthByGoogle) => Promise<UserResponse>;

  // Update user data
  forgotPassword: (data: UserForgotPassword) => Promise<void>;
  resetPassword: (password: string, token: string) => Promise<void>;
  setSelfPassword: (data: UserSelfPasswordSet) => Promise<UserResponse>;

  updateSelfGeneralInfo: (
    data: UserSelfGeneralInfoUpdate
  ) => Promise<UserResponse>;
  updateSelfContactInfo: (data: UserContactInfoUpdate) => Promise<UserResponse>;
  updateSelfPassword: (data: UserSelfPasswordUpdate) => Promise<UserResponse>;

  deleteAccount: () => Promise<void>;

  resetUserBalanceCache: () => void;

  updateUserBalanceCli: (amountCents: number) => void;
};

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuth: false,

  async checkAuth(): Promise<boolean> {
    const { isAuth } = get();
    if (isAuth) return true;

    try {
      const res = await retrieve(CHECK_AUTH_URL);
      if (!res.success) return false;

      const { user, isAuth } = res.data as CheckAuthResponse;
      set({ user, isAuth });
      console.log("User authenticated:", user); // DEV temp for testing
      return isAuth;
    } catch {
      set({ user: null, isAuth: false });
    }

    return false;
  },

  async signup(userData: UserSignup): Promise<UserResponse> {
    const { user } = get();
    if (user) throw new Error("User already signed up");

    try {
      const res = await post(SIGNUP_URL, userData);
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async verify(data: UserVerify): Promise<UserResponse> {
    const { user, isAuth } = get();
    if (user?.isEmailVerified && user?.isPhoneNumberVerified && isAuth) {
      throw new Error("User already verified");
    }

    try {
      const res = await post(VERIFY_USER_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ isAuth: true, user });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async login(data: UserLogin): Promise<UserResponse> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    try {
      const res = await post(LOGIN_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user, isAuth: true });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async logout(): Promise<void> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not login yet");

    try {
      const res = await post(LOGOUT_URL);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: null, isAuth: false });
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async forgotPassword(data: UserForgotPassword): Promise<void> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    try {
      const res = await post(FORGOT_PASSWORD_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async resetPassword(password: string, token: string): Promise<void> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    try {
      const res = await post(`${RESET_PASSWORD_URL}/${token}`, { password });
      if (!res.success) {
        throw new Error(res.message);
      }
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateSelfPassword(
    data: UserSelfPasswordUpdate
  ): Promise<UserResponse> {
    const { isAuth, user } = get();
    if (!isAuth) throw new Error("User not logged in");
    if (!user || user.authProvider !== "local") {
      throw new Error("Cannot update password when user is auth by provider");
    }

    try {
      const res = await patch(USER_UPDATE_SELF_PASSWORD_URL, undefined, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async authByGoogle(data: UserAuthByGoogle): Promise<UserResponse> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    try {
      const res = await post(AUTH_BY_GOOGLE_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user, isAuth: true });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateSelfGeneralInfo(
    data: UserSelfGeneralInfoUpdate
  ): Promise<UserResponse> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not logged in");

    try {
      const res = await patch(
        USER_UPDATE_SELF_GENERAL_INFO_URL,
        undefined,
        data
      );
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateSelfContactInfo(
    data: UserContactInfoUpdate
  ): Promise<UserResponse> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not logged in");

    try {
      const res = await patch(
        USER_UPDATE_SELF_CONTACT_INFO_URL,
        undefined,
        data
      );
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async setSelfPassword(data: UserSelfPasswordSet): Promise<UserResponse> {
    const { isAuth, user } = get();
    if (!isAuth) throw new Error("User not logged in");
    if (!user || user.authProvider === "local") {
      throw new Error("Cannot set password when user is not auth by provider");
    }

    try {
      const res = await patch(USER_SET_SELF_PASSWORD_URL, undefined, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      const user = res.data as UserResponse;
      set({ user });
      return structuredClone(user);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteAccount(): Promise<void> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not logged in");

    try {
      const res = await remove(USER_DELETE_ACCOUNT_URL);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: null, isAuth: false });
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  resetUserBalanceCache(): void {
    const { user } = get();
    if (!user) return;

    set({ user: { ...user, userBalanceCents: 0 } });
  },

  updateUserBalanceCli(amountCents: number): void {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, userBalanceCents: amountCents } });
  },
}));

export default useAuthStore;
