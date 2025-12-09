import { create } from "zustand";
import type {
  ProductBrandListResponse,
  ProductBrandResponse,
} from "../../../../../common/types.common";
import { PRODUCT_BRANDS_URL } from "../../../configs";
import { retrieve } from "../../../utils/utils";
import { formatError } from "../../../../../common/utils.common";

type ProductBrandState = {
  brands: ProductBrandListResponse | null;

  getBrand: (id: string) => ProductBrandResponse | undefined;

  fetchBrands: () => Promise<ProductBrandListResponse>;
};

const useProductBrandStore = create<ProductBrandState>((set, get) => ({
  brands: null,

  getBrand(id: string): ProductBrandResponse | undefined {
    return structuredClone(
      get().brands?.brands.brands.find((brand) => brand.id === id)
    );
  },

  async fetchBrands(): Promise<ProductBrandListResponse> {
    const { brands } = get();
    if (brands) return structuredClone(brands);

    try {
      const res = await retrieve(PRODUCT_BRANDS_URL);
      if (!res.success) throw new Error(res.message);

      const brands = res.data as ProductBrandListResponse;
      set({ brands });
      return structuredClone(brands);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProductBrandStore;
