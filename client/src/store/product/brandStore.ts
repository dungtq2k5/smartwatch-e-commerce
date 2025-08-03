import { create } from "zustand";
import type {
  ProductBrandListResponse,
  ProductBrandResponse,
} from "../../../../common/types.common";
import { PRODUCT_BRANDS_URL } from "../../configs";
import { formatError, retrieve } from "../../utils/utils";

type ProductBrandState = {
  brands?: ProductBrandListResponse;
  isFetching?: true;
  fetchErr?: string;
  isGetting?: true;
  getErr?: string;

  fetchBrands: () => Promise<void>;

  getBrand: (brandId: string) => Promise<ProductBrandResponse | undefined>;
};

export const useProductBrandStore = create<ProductBrandState>((set, get) => ({
  brands: undefined,
  isFetching: undefined,
  fetchErr: undefined,
  isGetting: undefined,
  getErr: undefined,

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

  async getBrand(brandId: string): Promise<ProductBrandResponse | undefined> {
    const { brands } = get();
    if (brands) {
      const brand = brands.brands.brands.find((b) => b.id === brandId);
      if (brand) return brand;
    }

    set({ isGetting: true, getErr: undefined });
    try {
      const res = await retrieve(`${PRODUCT_BRANDS_URL}/${brandId}`);
      if (!res.success) {
        set({ getErr: res.message });
        return;
      }

      return res.data as ProductBrandResponse;
    } catch (error) {
      set({ getErr: formatError(error) });
    } finally {
      set({ isGetting: undefined });
    }
  },
}));
