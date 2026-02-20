import { create } from "zustand";
import type {
  ProviderBulkDelete,
  ProviderCreate,
  ProviderDetailsResponse,
  ProviderListResponse,
  ProviderListResponseLight,
  ProviderResponse,
  ProviderSearchQuery,
  ProviderUpdate,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { PROVIDER_URL } from "../../../configs";
import { patch, post, remove, retrieve } from "../../../utils/utils";
import { MAX_PROVIDERS_TO_DELETE_BULK } from "../../../../../common/configs.common";

type ProviderState = {
  allProvidersLite: ProviderListResponseLight | null;

  removeCachedProviders: () => void;

  fetchAllProviders: () => Promise<ProviderListResponseLight>;
  fetchProviders: (
    query?: ProviderSearchQuery,
  ) => Promise<ProviderListResponse>;
  fetchProvider: (providerId: string) => Promise<ProviderResponse>;
  fetchProviderDetails: (
    providerId: string,
  ) => Promise<ProviderDetailsResponse>;

  createProvider: (provider: ProviderCreate) => Promise<ProviderResponse>;

  updateProvider: (
    providerId: string,
    providerData: ProviderUpdate,
  ) => Promise<ProviderResponse>;

  deleteProvider: (providerId: string) => Promise<void>;
  deleteProviderBulk: (data: ProviderBulkDelete) => Promise<void>;
};

const useProviderStore = create<ProviderState>((set, get) => ({
  allProvidersLite: null,

  removeCachedProviders(): void {
    set({ allProvidersLite: null });
  },

  async fetchAllProviders(): Promise<ProviderListResponseLight> {
    const { allProvidersLite } = get();
    if (allProvidersLite) {
      return structuredClone(allProvidersLite);
    }

    try {
      const res = await retrieve(`${PROVIDER_URL}/all/`);
      if (!res.success) throw new Error(res.message);

      const data = res.data as ProviderListResponseLight;
      set({ allProvidersLite: data });
      return structuredClone(data);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProviders(
    query?: ProviderSearchQuery,
  ): Promise<ProviderListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && !removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(`${PROVIDER_URL}?${queryString.toString()}`);
      if (!res.success) throw new Error(res.message);

      return res.data as ProviderListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProvider(providerId: string): Promise<ProviderResponse> {
    try {
      const res = await retrieve(`${PROVIDER_URL}/${providerId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as ProviderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProviderDetails(
    providerId: string,
  ): Promise<ProviderDetailsResponse> {
    try {
      const res = await retrieve(`${PROVIDER_URL}/${providerId}/details`);
      if (!res.success) throw new Error(res.message);

      return res.data as ProviderDetailsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createProvider(provider: ProviderCreate): Promise<ProviderResponse> {
    try {
      const res = await post(`${PROVIDER_URL}`, provider);
      if (!res.success) throw new Error(res.message);

      get().removeCachedProviders();
      return res.data as ProviderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateProvider(
    providerId: string,
    providerData: ProviderUpdate,
  ): Promise<ProviderResponse> {
    try {
      const res = await patch(PROVIDER_URL, providerId, providerData);
      if (!res.success) throw new Error(res.message);

      get().removeCachedProviders();
      return res.data as ProviderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteProvider(providerId: string): Promise<void> {
    try {
      const res = await remove(PROVIDER_URL, providerId);
      if (!res.success) throw new Error(res.message);

      const { allProvidersLite } = get();
      if (allProvidersLite) {
        const foundProviderIdx = allProvidersLite.providers.findIndex(
          (provider) => provider.id === providerId,
        );
        if (foundProviderIdx !== -1) {
          allProvidersLite.total -= 1;
          allProvidersLite.providers.splice(foundProviderIdx, 1);
          set({ allProvidersLite });
        }
      }
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteProviderBulk(data: ProviderBulkDelete): Promise<void> {
    try {
      if (data.providerIds.length === 0) {
        throw new Error("No providers selected for deletion.");
      }
      if (data.providerIds.length > MAX_PROVIDERS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_PROVIDERS_TO_DELETE_BULK} providers at once.`,
        );
      }

      const res = await remove(`${PROVIDER_URL}/many`, null, data);
      if (!res.success) throw new Error(res.message);

      get().removeCachedProviders();
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProviderStore;
