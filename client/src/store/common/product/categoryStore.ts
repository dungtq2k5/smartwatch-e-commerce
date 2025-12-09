import { create } from "zustand";
import type {
  ProductCategoryListResponse,
  ProductCategoryResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { PRODUCT_CATEGORIES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type ProductCategoryState = {
  categories: ProductCategoryListResponse | null;

  getCategory: (id: string) => ProductCategoryResponse | undefined;

  fetchCategories: () => Promise<ProductCategoryListResponse>;
};

const useProductCategoryStore = create<ProductCategoryState>((set, get) => ({
  categories: null,

  getCategory(id: string): ProductCategoryResponse | undefined {
    return structuredClone(
      get().categories?.categories.categories.find((cat) => cat.id === id)
    );
  },

  async fetchCategories(): Promise<ProductCategoryListResponse> {
    const { categories } = get();
    if (categories) return structuredClone(categories);

    try {
      const res = await retrieve(PRODUCT_CATEGORIES_URL);
      if (!res.success) throw new Error(res.message);

      const categories = res.data as ProductCategoryListResponse;
      set({ categories });
      return structuredClone(categories);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProductCategoryStore;
