import { create } from "zustand";
import type {
  ProviderAddressCreate,
  ProviderAddressResponse,
  ProviderAddressUpdate,
} from "../../../../../common/types.common";
import { PROVIDER_URL } from "../../../configs";
import { patch, post, remove, retrieve } from "../../../utils/utils";
import { formatError } from "../../../../../common/utils.common";

type ProviderAddressState = {
  fetchProviderAddress: (
    providerId: string,
    addressId: string,
  ) => Promise<ProviderAddressResponse>;

  createProviderAddress: (
    providerId: string,
    addressData: ProviderAddressCreate,
  ) => Promise<ProviderAddressResponse>;

  updateProviderAddress: (
    providerId: string,
    addressId: string,
    addressData: ProviderAddressUpdate,
  ) => Promise<ProviderAddressResponse>;

  deleteProviderAddress: (
    providerId: string,
    addressId: string,
  ) => Promise<void>;
};

const useProviderAddressStore = create<ProviderAddressState>(() => ({
  async fetchProviderAddress(
    providerId: string,
    addressId: string,
  ): Promise<ProviderAddressResponse> {
    try {
      const res = await retrieve(
        `${PROVIDER_URL}/${providerId}/addresses/${addressId}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as ProviderAddressResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createProviderAddress(
    providerId: string,
    addressData: ProviderAddressCreate,
  ): Promise<ProviderAddressResponse> {
    try {
      const res = await post(
        `${PROVIDER_URL}/${providerId}/addresses`,
        addressData,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as ProviderAddressResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateProviderAddress(
    providerId: string,
    addressId: string,
    addressData: ProviderAddressUpdate,
  ): Promise<ProviderAddressResponse> {
    try {
      const res = await patch(
        `${PROVIDER_URL}/${providerId}/addresses`,
        addressId,
        addressData,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as ProviderAddressResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteProviderAddress(
    providerId: string,
    addressId: string,
  ): Promise<void> {
    try {
      const res = await remove(
        `${PROVIDER_URL}/${providerId}/addresses`,
        addressId,
      );
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProviderAddressStore;
