import { create } from "zustand";
import type {
  AdminUserDetailResponse,
  AdminUserListResponse,
  AdminUserResponse,
  UserBulkDelete,
  UserCreate,
  UserEmailUpdate,
  UserPhoneNumberUpdate,
  UserSearchQuery,
  UserUpdate,
} from "../../../../common/types.common";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";
import { patch, post, remove, retrieve } from "../../utils/utils";
import { USER_URL } from "../../configs";
import { MAX_USERS_TO_DELETE_BULK } from "../../../../common/configs.common";

type UserState = {
  sysUserId: string | null;

  fetchUsers: (query?: UserSearchQuery) => Promise<AdminUserListResponse>;
  createUser: (userData: UserCreate) => Promise<AdminUserResponse>;

  updateUser: (
    userId: string,
    userData: UserUpdate
  ) => Promise<AdminUserResponse>;
  updateUserEmail: (
    userId: string,
    userData: UserEmailUpdate
  ) => Promise<AdminUserResponse>;
  updateUserPhoneNumber: (
    userId: string,
    userData: UserPhoneNumberUpdate
  ) => Promise<AdminUserResponse>;

  getSysUserId: () => Promise<string>;
  getUser: (userId: string) => Promise<AdminUserResponse>;
  getUserDetail: (userId: string) => Promise<AdminUserDetailResponse>;

  deleteUser: (userId: string) => Promise<void>;
  deleteUserBulk: (data: UserBulkDelete) => Promise<void>;
};

export const useUserStore = create<UserState>((set, get) => ({
  sysUserId: null,

  async fetchUsers(query?: UserSearchQuery): Promise<AdminUserListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.isEmailVerified !== undefined) {
        queryString.set("isEmailVerified", query.isEmailVerified);
      }
      if (query.isPhoneNumberVerified !== undefined) {
        queryString.set("isPhoneNumberVerified", query.isPhoneNumberVerified);
      }
      if (query.isLocked !== undefined) {
        queryString.set("isLocked", query.isLocked);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(`${USER_URL}?${queryString.toString()}`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminUserListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createUser(userData: UserCreate): Promise<AdminUserResponse> {
    try {
      const res = await post(USER_URL, userData);
      if (!res.success) throw new Error(res.message);

      const user = res.data as AdminUserResponse;
      return user;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateUser(
    userId: string,
    userData: UserUpdate
  ): Promise<AdminUserResponse> {
    try {
      const res = await patch(USER_URL, userId, userData);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminUserResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateUserEmail(
    userId: string,
    userData: UserEmailUpdate
  ): Promise<AdminUserResponse> {
    try {
      const res = await patch(
        `${USER_URL}/${userId}/email`,
        undefined,
        userData
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminUserResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateUserPhoneNumber(
    userId: string,
    userData: UserPhoneNumberUpdate
  ): Promise<AdminUserResponse> {
    try {
      const res = await patch(
        `${USER_URL}/${userId}/phone-number`,
        undefined,
        userData
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminUserResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getSysUserId(): Promise<string> {
    const { sysUserId } = get();
    if (sysUserId) return sysUserId;

    try {
      const res = await retrieve(`${USER_URL}/sys-user-id`);
      if (!res.success) throw new Error(res.message);

      const { sysUserId } = res.data as { sysUserId: string };
      set({ sysUserId });
      return sysUserId;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getUser(userId: string): Promise<AdminUserResponse> {
    try {
      const res = await retrieve(`${USER_URL}/${userId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminUserResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getUserDetail(userId: string): Promise<AdminUserDetailResponse> {
    try {
      const res = await retrieve(`${USER_URL}/${userId}/details`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminUserDetailResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      const { sysUserId } = get();
      if (userId === sysUserId) {
        throw new Error("Cannot delete the system user.");
      }

      const res = await remove(`${USER_URL}/${userId}`);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteUserBulk(data: UserBulkDelete): Promise<void> {
    try {
      if (data.userIds.length === 0) {
        throw new Error("No users selected for deletion");
      }
      if (data.userIds.length > MAX_USERS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_USERS_TO_DELETE_BULK} users at once.`
        );
      }

      const { sysUserId } = get();
      if (sysUserId && data.userIds.includes(sysUserId)) {
        throw new Error("Cannot delete the system user.");
      }

      const res = await remove(`${USER_URL}/many`, null, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
