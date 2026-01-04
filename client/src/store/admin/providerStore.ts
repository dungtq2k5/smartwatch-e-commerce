import { create } from "zustand";
import type { ProviderListResponse } from "../../../../common/types.common";
import { formatError } from "../../../../common/utils.common";
import { PROVIDER_URL } from "../../configs";
import { retrieve } from "../../utils/utils";

type ProviderState = {
  providers: ProviderListResponse | null;

  fetchProviders: () => Promise<ProviderListResponse>;
};

const useProviderStore = create<ProviderState>((set, get) => ({
  providers: null,

  async fetchProviders(): Promise<ProviderListResponse> {
    const { providers } = get();
    if (providers) return structuredClone(providers);

    try {
      const res = await retrieve(`${PROVIDER_URL}`);
      if (!res.success) throw new Error(res.message);

      const providers = res.data as ProviderListResponse;
      set({ providers });
      return structuredClone(providers);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProviderStore;
