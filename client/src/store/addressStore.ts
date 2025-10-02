import { create } from "zustand";
import type {
  UserAddressCreate,
  UserAddressResponse,
  UserAddressListResponse,
  UserAddressUpdate,
} from "../../../common/types.common";
import { retrieve, patch, remove, post } from "../utils/utils";
import { SELF_ADDRESSES_URL } from "../configs";
import { formatError } from "../../../common/utils.common";

type UserAddressState = {
  addresses: UserAddressListResponse | null;

  fetchAddresses: () => Promise<UserAddressListResponse>;
  deleteAddress: (addressId: string) => Promise<void>;
  createAddress: (
    addressData: UserAddressCreate
  ) => Promise<UserAddressResponse>;
  updateAddress: (
    addressData: UserAddressUpdate,
    addressId: string
  ) => Promise<UserAddressResponse>;

  getAddress: (addressId: string) => Promise<UserAddressResponse>;
  getAddressSync: (addressId: string) => UserAddressResponse | undefined;
  getDefaultAddress: () => Promise<UserAddressResponse | undefined>;
};

export const useUserAddressStore = create<UserAddressState>((set, get) => ({
  addresses: null,

  async fetchAddresses(): Promise<UserAddressListResponse> {
    const { addresses } = get();
    if (addresses) return addresses;

    try {
      const res = await retrieve(SELF_ADDRESSES_URL);
      if (!res.success) throw new Error(res.message);

      const addresses = res.data as UserAddressListResponse;
      set({ addresses });
      return addresses;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteAddress(addressId: string): Promise<void> {
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
    }
  },

  async createAddress(
    addressData: UserAddressCreate
  ): Promise<UserAddressResponse> {
    try {
      const res = await post(SELF_ADDRESSES_URL, addressData);
      if (!res.success) throw new Error(res.message);

      const newAddress = res.data as UserAddressResponse;
      // Refresh addresses by adding the new address and handle isDefault
      const { addresses } = get();
      if (addresses) {
        let existingAddresses = addresses.addresses;

        // If new address is default, make sure no other address is non-default
        if (newAddress.isDefault) {
          existingAddresses = existingAddresses.map((addr) =>
            addr.isDefault ? { ...addr, isDefault: false } : addr
          );
        }

        const updatedAddresses = [...existingAddresses, newAddress];

        set({
          addresses: {
            ...addresses,
            total: updatedAddresses.length,
            addresses: updatedAddresses,
          },
        });
      }

      return newAddress;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateAddress(
    addressData: UserAddressUpdate,
    addressId: string
  ): Promise<UserAddressResponse> {
    try {
      const res = await patch(SELF_ADDRESSES_URL, addressId, addressData);
      if (!res.success) throw new Error(res.message);

      const updatedAddress = res.data as UserAddressResponse;
      const { addresses } = get();
      if (addresses) {
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
          const addrIdxToUpdate = updatedAddresses.findIndex(
            (addr) => addr.id === addressId
          );
          if (addrIdxToUpdate !== -1) {
            updatedAddresses[addrIdxToUpdate] = updatedAddress;
          }
        }

        set({
          addresses: {
            total: updatedAddresses.length,
            addresses: updatedAddresses,
          },
        });
      }

      return updatedAddress;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getAddress(addressId: string): Promise<UserAddressResponse> {
    const { addresses } = get();
    if (addresses) {
      const address = addresses.addresses.find(
        (address) => address.id === addressId
      );
      if (address) return address;
    }

    try {
      const res = await retrieve(`${SELF_ADDRESSES_URL}/${addressId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as UserAddressResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getAddressSync(addressId: string): UserAddressResponse | undefined {
    const { addresses } = get();
    return addresses?.addresses.find((address) => address.id === addressId);
  },

  async getDefaultAddress(): Promise<UserAddressResponse | undefined> {
    const { addresses } = get();
    if (addresses) {
      return addresses.addresses.find((address) => address.isDefault);
    }

    try {
      const res = await retrieve(`${SELF_ADDRESSES_URL}/default`);
      if (!res.success) throw new Error(res.message);

      return res.data as UserAddressResponse | undefined; // Undefined when user doesn't have any addresses
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
