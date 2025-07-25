import { create } from "zustand";
import type { ProductBrandListResponse } from "../../../../common/types.common";
import { PRODUCT_BRANDS_URL } from "../../configs";
import { formatError, retrieve } from "../../utils/utils";

type ProductBrandState = {
  brands?: ProductBrandListResponse;
  isFetching?: true;
  fetchErr?: string;

  fetchBrands: () => Promise<void>;
};

export const useProductBrandStore = create<ProductBrandState>((set, get) => ({
  brands: undefined,
  isFetching: undefined,
  fetchErr: undefined,

  async fetchBrands(): Promise<void> {
    const { brands } = get();
    if (!brands) {
      set({ isFetching: true, fetchErr: undefined });

      try {
        const res = await retrieve(PRODUCT_BRANDS_URL);
        if (!res.success) {
          set({ fetchErr: res.message });
          return;
        }

        set({ brands: res.data as ProductBrandListResponse });
      } catch (error) {
        set({ fetchErr: formatError(error) });
      } finally {
        set({ isFetching: undefined });
      }
    }
  },
}));
