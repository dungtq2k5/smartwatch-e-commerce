import { create } from "zustand";
import type {
  AdminUserLogin,
  AdminUserResponse,
  CheckAdminAuthResponse,
} from "../../../../common/types.common";
import {
  ADMIN_LOGIN_URL,
  CHECK_ADMIN_AUTH_URL,
  LOGOUT_URL,
} from "../../configs";
import { post, retrieve } from "../../utils/utils";
import { formatError } from "../../../../common/utils.common";

type AuthState = {
  admin: AdminUserResponse | null;

  checkAuth: () => Promise<boolean>;
  login: (data: AdminUserLogin) => Promise<AdminUserResponse>;
  logout: () => Promise<void>;
};

const useAuthStore = create<AuthState>((set, get) => ({
  admin: null,

  async checkAuth(): Promise<boolean> {
    const { admin } = get();
    if (admin) return true;

    try {
      const res = await retrieve(CHECK_ADMIN_AUTH_URL);
      if (!res.success) return false;

      const { admin } = res.data as CheckAdminAuthResponse;
      set({ admin });
      console.log("Admin authenticated:", admin); // DEV temp for testing
      return true;
    } catch {
      return false;
    }
  },

  async login(data: AdminUserLogin): Promise<AdminUserResponse> {
    if (get().admin) {
      throw new Error("Already logged in as admin");
    }

    try {
      const res = await post(ADMIN_LOGIN_URL, data);
      if (!res.success) {
        throw new Error(res.message);
      }

      const admin = res.data as AdminUserResponse;
      set({ admin });
      return structuredClone(admin);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async logout(): Promise<void> {
    if (!get().admin) {
      throw new Error("Not logged in as admin");
    }

    try {
      const res = await post(LOGOUT_URL);
      if (!res.success) {
        throw new Error(res.message);
      }

      set({ admin: null });
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useAuthStore;

