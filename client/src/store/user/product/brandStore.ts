import { create } from "zustand";
import type { ProductBrandListResponse } from "../../../../../common/types.common";
import { PRODUCT_BRANDS_URL } from "../../../configs";
import { retrieve } from "../../../utils/utils";
import { formatError } from "../../../../../common/utils.common";

type ProductBrandState = {
  brands: ProductBrandListResponse | null;

  fetchBrands: () => Promise<ProductBrandListResponse>;
};

export const useProductBrandStore = create<ProductBrandState>((set, get) => ({
  brands: null,

  async fetchBrands(): Promise<ProductBrandListResponse> {
    const { brands } = get();
    if (brands) return brands;

    try {
      const res = await retrieve(PRODUCT_BRANDS_URL);
      if (!res.success) throw new Error(res.message);

      const brands = res.data as ProductBrandListResponse;
      set({ brands });
      return brands;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
