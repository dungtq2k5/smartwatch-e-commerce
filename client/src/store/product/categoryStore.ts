import { create } from "zustand";
import type { ProductCategoryListResponse } from "../../../../common/types.common";
import { formatError, retrieve } from "../../utils/utils";
import { PRODUCT_CATEGORIES_URL } from "../../configs";

type ProductCategoryState = {
  categories?: ProductCategoryListResponse;
  isFetching?: true;
  fetchErr?: string;

  fetchCategories: () => Promise<void>;
};

export const useProductCategoryStore = create<ProductCategoryState>((set, get) => ({
  categories: undefined,
  isFetching: undefined,
  fetchErr: undefined,

  async fetchCategories(): Promise<void> {
    const { categories } = get();
    if (!categories) {
      set({ isFetching: true, fetchErr: undefined });

      try {
        const res = await retrieve(PRODUCT_CATEGORIES_URL);
        if (!res.success) {
          set({ fetchErr: res.message });
          return;
        }

        set({ categories: res.data as ProductCategoryListResponse });
      } catch (error) {
        set({ fetchErr: formatError(error) });
      } finally {
        set({ isFetching: undefined });
      }
    }
  },
}));