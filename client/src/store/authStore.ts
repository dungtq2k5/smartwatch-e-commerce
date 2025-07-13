import { create } from "zustand";
import type {
  UserResponse,
  UserSignup,
  Response,
  UserVerify,
  UserLogin,
  CheckAuthResponse,
  UserForgotPassword,
} from "../../../common/types.common";
import { formatError, get, post } from "../utils/utils";
import {
  CHECK_AUTH_URL,
  FORGOT_PASSWORD_URL,
  LOGIN_URL,
  RESET_PASSWORD_URL,
  SIGNUP_URL,
  VERIFY_USER_URL,
} from "../configs";

type AuthState = {
  user?: UserResponse;
  isAuth: boolean;
  isLoading?: true;
  err?: string;
  isCheckingAuth?: true;

  stopLoading: () => void;
  clearError: () => void;

  checkAuth: () => Promise<void>;

  signup: (user: UserSignup) => Promise<Response>;
  signupStart: () => void;
  signupSuccess: (user: UserResponse) => void;
  signupFailure: (err: unknown) => void;

  verify: (data: UserVerify) => Promise<Response>;
  verifyStart: () => void;
  verifySuccess: () => void;
  verifyFailure: (err: unknown) => void;

  login: (data: UserLogin) => Promise<Response>;
  loginStart: () => void;
  loginSuccess: (user: UserResponse) => void;
  loginFailure: (err: unknown) => void;

  forgotPassword: (data: UserForgotPassword) => Promise<Response>;
  forgotPasswordStart: () => void;
  forgotPasswordSuccess: () => void;
  forgotPasswordFailure: (err: unknown) => void;

  resetPassword: (password: string, token: string) => Promise<Response>;
  resetPasswordStart: () => void;
  resetPasswordSuccess: () => void;
  resetPasswordFailure: (err: unknown) => void;

  // TODO logout...
};

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  isAuth: false,
  isLoading: undefined,
  err: undefined,

  stopLoading: () => set({ isLoading: undefined }),
  clearError: () => set({ err: undefined }),

  // Check authentication status
  async checkAuth(): Promise<void> {
    set({ isCheckingAuth: true });

    try {
      const res = await get(CHECK_AUTH_URL);
      if (!res.success) return;

      const { user, isAuth } = res.data as CheckAuthResponse;
      set({ user, isAuth });
      console.log("User authenticated:", user); // DEV temp for testing
    } catch {
      // Do nothing
    } finally {
      set({ isCheckingAuth: undefined });
    }
  },

  // Signup
  async signup(user: UserSignup): Promise<Response> {
    return await post(SIGNUP_URL, user);
  },
  signupStart(): void {
    set({ isLoading: true, err: undefined });
  },
  signupSuccess(user: UserResponse): void {
    set({ user, isLoading: undefined });
  },
  signupFailure(err: unknown): void {
    set({ isLoading: undefined, err: formatError(err) });
  },

  // Verify
  async verify(data: UserVerify): Promise<Response> {
    return await post(VERIFY_USER_URL, data);
  },
  verifyStart(): void {
    set({ isLoading: true, err: undefined });
  },
  verifySuccess(): void {
    set({ isAuth: true, isLoading: undefined });
  },
  verifyFailure(err: unknown): void {
    set({ isLoading: undefined, err: formatError(err) });
  },

  // Login
  async login(data: UserLogin): Promise<Response> {
    return await post(LOGIN_URL, data);
  },
  loginStart(): void {
    set({ isLoading: true, err: undefined });
  },
  loginSuccess(user: UserResponse): void {
    set({ user, isAuth: true, isLoading: undefined });
  },
  loginFailure(err: unknown): void {
    set({ isLoading: undefined, err: formatError(err) });
  },

  // Forgot Password
  async forgotPassword(data: UserForgotPassword): Promise<Response> {
    return await post(FORGOT_PASSWORD_URL, data);
  },
  forgotPasswordStart(): void {
    set({ isLoading: true, err: undefined });
  },
  forgotPasswordSuccess(): void {
    set({ isLoading: undefined });
  },
  forgotPasswordFailure(err) {
    set({ isLoading: undefined, err: formatError(err) });
  },

  // Reset Password
  async resetPassword(password: string, token: string): Promise<Response> {
    return await post(`${RESET_PASSWORD_URL}/${token}`, { password });
  },
  resetPasswordStart(): void {
    set({ isLoading: true, err: undefined });
  },
  resetPasswordSuccess(): void {
    set({ isLoading: undefined });
  },
  resetPasswordFailure(err) {
    set({ isLoading: undefined, err: formatError(err) });
  },
}));
