import { create } from "zustand";
import type { ProductOsListResponse, ProductOsResponse } from "../../../../common/types.common"
import { PRODUCT_OS_URL } from "../../configs";
import { formatError, retrieve } from "../../utils/utils";

type ProductOsState = {
  oses?: ProductOsListResponse;
  isFetching?: true;
  fetchErr?: string;
  isGetting?: true;
  getErr?: string;

  fetchOses: () => Promise<void>;

  getOs: (osId: string) => Promise<ProductOsResponse | undefined>;
};

export const useProductOsStore = create<ProductOsState>((set, get) => ({
  oses: undefined,
  isFetching: undefined,
  fetchErr: undefined,
  isGetting: undefined,
  getErr: undefined,

  async fetchOses(): Promise<void> {
    const { oses } = get();
    if (!oses) {
      set({ isFetching: true, fetchErr: undefined });

      try {
        const res = await retrieve(PRODUCT_OS_URL);
        if (!res.success) {
          set({ fetchErr: res.message });
          return;
        }

        set({ oses: res.data as ProductOsListResponse });
      } catch (error) {
        set({ fetchErr: formatError(error) });
      } finally {
        set({ isFetching: undefined });
      }
    }
  },

  async getOs(osId: string): Promise<ProductOsResponse | undefined> {
    const { oses } = get();
    if (oses) {
      const os = oses.oses.oses.find((o) => o.id === osId);
      if (os) return os;
    }

    set({ isGetting: true, getErr: undefined });
    try {
      const res = await retrieve(`${PRODUCT_OS_URL}/${osId}`);
      if (!res.success) {
        set({ getErr: res.message });
        return;
      }

      return res.data as ProductOsResponse;
    } catch (error) {
      set({ getErr: formatError(error) });
    } finally {
      set({ isGetting: undefined });
    }
  },
}));