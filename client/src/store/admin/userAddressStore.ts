import { create } from "zustand";
import type { UserAddressListResponse } from "../../../../common/types.common";
import { formatError } from "../../../../common/utils.common";
import { USER_URL } from "../../configs";
import { retrieve } from "../../utils/utils";

type UserAddressStore = {
  getUserAddressesByUserId: (
    userId: string
  ) => Promise<UserAddressListResponse>;
};

export const useUserAddressStore = create<UserAddressStore>(() => ({
  async getUserAddressesByUserId(
    userId: string
  ): Promise<UserAddressListResponse> {
    try {
      const res = await retrieve(`${USER_URL}/${userId}/addresses`);
      if (!res.success) throw new Error(res.message);

      return res.data as UserAddressListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
