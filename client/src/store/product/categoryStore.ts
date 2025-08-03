import { create } from "zustand";
import type {
  ProductCategoryListResponse,
  ProductCategoryResponse,
} from "../../../../common/types.common";
import { formatError, retrieve } from "../../utils/utils";
import { PRODUCT_CATEGORIES_URL } from "../../configs";

type ProductCategoryState = {
  categories?: ProductCategoryListResponse;
  isFetching?: true;
  fetchErr?: string;
  isGetting?: true;
  getErr?: string;

  fetchCategories: () => Promise<void>;

  getCategory: (
    categoryId: string
  ) => Promise<ProductCategoryResponse | undefined>;
};

export const useProductCategoryStore = create<ProductCategoryState>(
  (set, get) => ({
    categories: undefined,
    isFetching: undefined,
    fetchErr: undefined,
    isGetting: undefined,
    getErr: undefined,

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

    async getCategory(
      categoryId: string
    ): Promise<ProductCategoryResponse | undefined> {
      const { categories } = get();
      if (categories) {
        const category = categories.categories.categories.find(
          (c) => c.id === categoryId
        );
        if (category) return category;
      }

      set({ isGetting: true, getErr: undefined });
      try {
        const res = await retrieve(`${PRODUCT_CATEGORIES_URL}/${categoryId}`);
        if (!res.success) {
          set({ getErr: res.message });
          return;
        }

        return res.data as ProductCategoryResponse;
      } catch (error) {
        set({ getErr: formatError(error) });
      } finally {
        set({ isGetting: undefined });
      }
    },
  })
);
