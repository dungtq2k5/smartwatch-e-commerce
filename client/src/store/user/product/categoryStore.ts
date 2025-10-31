import { create } from "zustand";
import type { ProductCategoryListResponse } from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { PRODUCT_CATEGORIES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type ProductCategoryState = {
  categories: ProductCategoryListResponse | null;

  fetchCategories: () => Promise<ProductCategoryListResponse>;
};

export const useProductCategoryStore = create<ProductCategoryState>((set, get) => ({
  categories: null,

  async fetchCategories(): Promise<ProductCategoryListResponse> {
    const { categories } = get();
    if (categories) return categories;

    try {
      const res = await retrieve(PRODUCT_CATEGORIES_URL);
      if (!res.success) throw new Error(res.message);

      const categories = res.data as ProductCategoryListResponse;
      set({ categories });
      return categories;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
