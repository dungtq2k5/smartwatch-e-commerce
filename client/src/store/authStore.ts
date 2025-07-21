import { create } from "zustand";
import type {
  UserResponse,
  UserSignup,
  UserVerify,
  UserLogin,
  CheckAuthResponse,
  UserForgotPassword,
  UserAuthByGoogle,
  UserUpdateSelfGeneralInfo,
  UserUpdateContactInfo,
  UserUpdateSelfPassword,
  UserSetSelfPassword,
} from "../../../common/types.common";
import { formatError, post, patch, retrieve, remove } from "../utils/utils";
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
  USER_UPDATE_SELF_PASSWORD,
  USER_SET_SELF_PASSWORD,
  LOGOUT_URL,
  USER_DELETE_ACCOUNT,
} from "../configs";

type AuthState = {
  user?: UserResponse;
  isAuth: boolean; // If this is true, user data must be defined
  isLoading?: true;
  isCheckingAuth?: true;
  isGetting?: true;
  getErr?: string;
  isDeleting?: true;

  startLoading: () => void;
  stopLoading: () => void;

  checkAuth: () => Promise<void>;

  signup: (user: UserSignup) => Promise<void>;

  verify: (data: UserVerify) => Promise<void>;

  login: (data: UserLogin) => Promise<void>;
  logout: () => Promise<void>;

  forgotPassword: (data: UserForgotPassword) => Promise<void>;
  resetPassword: (password: string, token: string) => Promise<void>;

  authByGoogle: (data: UserAuthByGoogle) => Promise<void>;

  updateSelfGeneralInfo: (data: UserUpdateSelfGeneralInfo) => Promise<void>;

  updateSelfContactInfo: (data: UserUpdateContactInfo) => Promise<void>;

  updateSelfPassword: (data: UserUpdateSelfPassword) => Promise<void>;

  setSelfPassword: (data: UserSetSelfPassword) => Promise<void>;

  deleteAccount: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: undefined,
  isAuth: false,
  isLoading: undefined,
  isCheckingAuth: undefined,
  isGetting: undefined,
  getErr: undefined,
  isDeleting: undefined,

  startLoading: () => set({ isLoading: true }),
  stopLoading: () => set({ isLoading: undefined }),

  async checkAuth(): Promise<void> {
    const { isAuth } = get();
    if (isAuth) return;

    set({ isCheckingAuth: true });
    try {
      const res = await retrieve(CHECK_AUTH_URL);
      if (!res.success) return;

      const { user, isAuth } = res.data as CheckAuthResponse;
      set({ user, isAuth });
      console.log("User authenticated:", user); // DEV temp for testing
    } catch {
      // Do nothing if the user is not authenticated
    } finally {
      set({ isCheckingAuth: undefined });
    }
  },

  async signup(userData: UserSignup): Promise<void> {
    const { user } = get();
    if (user) throw new Error("User already signed up");

    set({ isLoading: true });
    try {
      const res = await post(SIGNUP_URL, userData);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async verify(data: UserVerify): Promise<void> {
    const { user, isAuth } = get();
    if (user?.isEmailVerified && user?.isPhoneNumberVerified && isAuth)
      throw new Error("User already verified");

    set({ isLoading: true });
    try {
      const res = await post(VERIFY_USER_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ isAuth: true, user: res.data as UserResponse });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async login(data: UserLogin): Promise<void> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    set({ isLoading: true });
    try {
      const res = await post(LOGIN_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse, isAuth: true });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async logout(): Promise<void> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not login yet");

    set({ isLoading: true });
    try {
      const res = await post(LOGOUT_URL);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: undefined, isAuth: false });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async forgotPassword(data: UserForgotPassword): Promise<void> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    set({ isLoading: true });
    try {
      const res = await post(FORGOT_PASSWORD_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async resetPassword(password: string, token: string): Promise<void> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    set({ isLoading: true });
    try {
      const res = await post(`${RESET_PASSWORD_URL}/${token}`, { password });
      if (!res.success) {
        throw new Error(res.message);
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async authByGoogle(data: UserAuthByGoogle): Promise<void> {
    const { isAuth } = get();
    if (isAuth) throw new Error("User already logged in");

    set({ isLoading: true });
    try {
      const res = await post(AUTH_BY_GOOGLE_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse, isAuth: true });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async updateSelfGeneralInfo(data: UserUpdateSelfGeneralInfo): Promise<void> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not logged in");

    set({ isLoading: true });
    try {
      const res = await patch(
        USER_UPDATE_SELF_GENERAL_INFO_URL,
        undefined,
        data
      );
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async updateSelfContactInfo(data: UserUpdateContactInfo): Promise<void> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not logged in");

    set({ isLoading: true });
    try {
      const res = await patch(
        USER_UPDATE_SELF_CONTACT_INFO_URL,
        undefined,
        data
      );
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async updateSelfPassword(data: UserUpdateSelfPassword): Promise<void> {
    const { isAuth, user } = get();
    if (!isAuth) throw new Error("User not logged in");
    if (!user || user.authProvider !== "local") {
      throw new Error("Cannot update password when user is auth by provider");
    }

    set({ isLoading: true });
    try {
      const res = await patch(USER_UPDATE_SELF_PASSWORD, undefined, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async setSelfPassword(data: UserSetSelfPassword): Promise<void> {
    const { isAuth, user } = get();
    if (!isAuth) throw new Error("User not logged in");
    if (!user || user.authProvider === "local") {
      throw new Error("Cannot set password when user is not auth by provider");
    }

    set({ isLoading: true });
    try {
      const res = await patch(USER_SET_SELF_PASSWORD, undefined, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: res.data as UserResponse });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async deleteAccount(): Promise<void> {
    const { isAuth } = get();
    if (!isAuth) throw new Error("User not logged in");

    set({ isDeleting: true });
    try {
      const res = await remove(USER_DELETE_ACCOUNT);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ user: undefined, isAuth: false });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isDeleting: undefined });
    }
  },
}));
