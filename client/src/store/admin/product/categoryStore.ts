import { create } from "zustand";
import type {
  AdminProductCategoryListResponse as AdminCategoryListResponse,
  AdminProductCategoryResponse as AdminCategoryResponse,
  ProductCategoryBulkDelete as CategoryBulkDelete,
  ProductCategorySearchQuery as CategorySearchQuery,
  ProductCategoryUpdate as CategoryUpdate,
  ProductCategoryCreate,
  ProductCategoryResponse,
} from "../../../../../common/types.common";
import { PRODUCT_CATEGORIES_URL } from "../../../configs";
import { patch, post, remove, retrieve } from "../../../utils/utils";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK } from "../../../../../common/configs.common";

type ProductCategoryState = {
  fetchCategory: (categoryId: string) => Promise<AdminCategoryResponse>;
  fetchCategories: (
    query?: CategorySearchQuery,
  ) => Promise<AdminCategoryListResponse>;

  createCategory: (
    categoryData: ProductCategoryCreate,
  ) => Promise<ProductCategoryResponse>;

  updateCategory: (
    categoryId: string,
    categoryData: CategoryUpdate,
  ) => Promise<AdminCategoryResponse>;

  deleteCategory: (categoryId: string) => Promise<void>;
  deleteCategoryBulk: (data: CategoryBulkDelete) => Promise<void>;
};

const useProductCategoryStore = create<ProductCategoryState>(() => ({
  async fetchCategory(categoryId: string): Promise<AdminCategoryResponse> {
    try {
      const res = await retrieve(
        `${PRODUCT_CATEGORIES_URL}/${categoryId}/admin`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminCategoryResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchCategories(
    query?: CategorySearchQuery,
  ): Promise<AdminCategoryListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
    }

    try {
      const res = await retrieve(
        `${PRODUCT_CATEGORIES_URL}/admin?${queryString.toString()}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminCategoryListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createCategory(
    categoryData: ProductCategoryCreate,
  ): Promise<ProductCategoryResponse> {
    try {
      const res = await post(PRODUCT_CATEGORIES_URL, categoryData);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductCategoryResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateCategory(
    categoryId: string,
    categoryData: CategoryUpdate,
  ): Promise<AdminCategoryResponse> {
    try {
      const res = await patch(PRODUCT_CATEGORIES_URL, categoryId, categoryData);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminCategoryResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const res = await remove(PRODUCT_CATEGORIES_URL, categoryId);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteCategoryBulk(data: CategoryBulkDelete): Promise<void> {
    try {
      if (data.categoryIds.length === 0) {
        throw new Error("No categories selected for deletion.");
      }
      if (data.categoryIds.length > MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_PRODUCT_CATEGORIES_TO_DELETE_BULK} categories at once.`,
        );
      }

      const res = await remove(
        `${PRODUCT_CATEGORIES_URL}/many`,
        undefined,
        data,
      );
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProductCategoryStore;
