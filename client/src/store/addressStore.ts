import { create } from "zustand";
import type {
  UserAddressCreate,
  UserAddressResponse,
  UserAddressResponseList,
  UserAddressUpdate,
} from "../../../common/types.common";
import { formatError, get as fetch, patch, remove, post } from "../utils/utils";
import { SELF_ADDRESSES_URL } from "../configs";

type UserAddressState = {
  addresses?: UserAddressResponseList;
  isFetching: boolean;
  fetchErr?: string;
  isLoading?: boolean; // For delete, create, update operations
  getErr?: string; // For fetching a single address
  isGetting?: boolean; // For fetching a single address

  fetchAddresses: () => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  createAddress: (addressData: UserAddressCreate) => Promise<void>;
  updateAddress: (
    addressData: UserAddressUpdate,
    addressId: string
  ) => Promise<void>;
  getAddress: (addressId: string) => Promise<UserAddressResponse | undefined>;
};

export const useUserAddressStore = create<UserAddressState>((set, get) => ({
  addresses: undefined,
  isFetching: true,
  fetchErr: undefined,
  isLoading: undefined,
  getErr: undefined,
  isGetting: undefined,

  async fetchAddresses(): Promise<void> {
    const { addresses } = get();
    if (!addresses) {
      set({ isFetching: true, fetchErr: undefined });

      try {
        const res = await fetch(SELF_ADDRESSES_URL);
        if (!res.success) {
          set({ fetchErr: res.message });
          return;
        }

        set({ addresses: res.data as UserAddressResponseList });
      } catch (error) {
        set({ fetchErr: formatError(error) });
      } finally {
        set({ isFetching: false });
      }
    }
  },

  async deleteAddress(addressId: string): Promise<void> {
    set({ isLoading: true });

    try {
      const res = await remove(SELF_ADDRESSES_URL, addressId);
      if (!res.success) throw new Error(res.message);

      // Refresh addresses after deletion by filtering
      const { addresses } = get();
      if (addresses) {
        const updatedAddresses = addresses.addresses.filter(
          (address) => address.id !== addressId
        );
        set({
          addresses: {
            ...addresses,
            total: updatedAddresses.length,
            addresses: updatedAddresses,
          },
        });
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: false });
    }
  },

  async createAddress(addressData: UserAddressCreate): Promise<void> {
    set({ isLoading: true });

    try {
      const res = await post(SELF_ADDRESSES_URL, addressData);
      if (!res.success) throw new Error(res.message);

      // Refresh addresses by adding the new address and handle isDefault
      set((state) => {
        if (!state.addresses) return {}; // Should not happen

        const newAddress = res.data as UserAddressResponse;
        let existingAddresses = state.addresses.addresses;

        // If new address is default, make sure no other address is non-default
        if (newAddress.isDefault) {
          existingAddresses = existingAddresses.map((addr) =>
            addr.isDefault
              ? { ...addr, isDefault: false }
              : addr
          );
        }

        const updatedAddresses = [...existingAddresses, newAddress];

        return {
          addresses: {
            ...state.addresses,
            total: updatedAddresses.length,
            addresses: updatedAddresses,
          },
        };
      });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: false });
    }
  },

  async updateAddress(
    addressData: UserAddressUpdate,
    addressId: string
  ): Promise<void> {
    set({ isLoading: true });

    try {
      const res = await patch(SELF_ADDRESSES_URL, addressId, addressData);
      if (!res.success) throw new Error(res.message);

      set((state) => {
        const { addresses } = state;
        if (!addresses) return {}; // Should not happen

        const updatedAddress = res.data as UserAddressResponse;
        let updatedAddresses = addresses.addresses;

        // If the update was set to default, also update other addresses which were default
        if (updatedAddress.isDefault) {
          updatedAddresses = updatedAddresses.map((addr) => {
            if (addr.id === addressId) return updatedAddress;
            if (addr.isDefault) return { ...addr, isDefault: false };
            return addr;
          });
        } else {
          // If not set to default, just update the specific address
          updatedAddresses = updatedAddresses.map((addr) =>
            addr.id === addressId ? updatedAddress : addr
          );
        }

        return {
          addresses: {
            ...addresses,
            addresses: updatedAddresses,
          },
        };
      });
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: false });
    }
  },

  async getAddress(addressId: string): Promise<UserAddressResponse | undefined> {
    const { addresses } = get();
    if (addresses) {
      const address = addresses.addresses.find((address) => address.id === addressId);
      if (address) return address;
    }

    set({ isGetting: true });
    try {
      const res = await fetch(`${SELF_ADDRESSES_URL}/${addressId}`);
      if (!res.success) {
        set({ getErr: res.message });
        return;
      }

      return res.data as UserAddressResponse;
    } catch (error) {
      set({ getErr: formatError(error) });
    } finally {
      set({ isGetting: false });
    }
  }
}));
