import { create } from "zustand";
import type {
  AdminProductDetailResponse,
  AdminProductListResponse,
  AdminProductResponse,
  ProductBulkDelete,
  ProductDetailQuery,
  ProductResponse,
  ProductSearchQuery,
  ProductUpdate,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { patch, remove, retrieve } from "../../../utils/utils";
import { PRODUCT_ADMIN_SEARCH_URL, PRODUCT_URL } from "../../../configs";
import { MAX_PRODUCTS_TO_DELETE_BULK } from "../../../../../common/configs.common";

type ProductState = {
  fetchProducts: (
    query?: ProductSearchQuery
  ) => Promise<AdminProductListResponse>;

  fetchProduct: (productId: string) => Promise<AdminProductResponse>;
  fetchProductDetail: (
    productId: string,
    query?: ProductDetailQuery
  ) => Promise<AdminProductDetailResponse>;

  deleteProduct: (productId: string) => Promise<void>;
  deleteProductBulk: (data: ProductBulkDelete) => Promise<void>;

  updateProduct: (
    productId: string,
    data: ProductUpdate
  ) => Promise<ProductResponse>;
};

const useProductStore = create<ProductState>(() => ({
  async fetchProducts(
    query?: ProductSearchQuery
  ): Promise<AdminProductListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.type) queryString.set("type", query.type);
      if (query.brandIds?.length) {
        for (const id of query.brandIds) {
          queryString.append("brandId", id);
        }
      }
      if (query.categoryIds?.length) {
        for (const id of query.categoryIds) {
          queryString.append("categoryId", id);
        }
      }
      if (query.stopSelling) queryString.set("stopSelling", query.stopSelling);
      if (query.priceCentsMin) {
        queryString.set("priceCentsMin", query.priceCentsMin);
      }
      if (query.priceCentsMax) {
        queryString.set("priceCentsMax", query.priceCentsMax);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(
        `${PRODUCT_ADMIN_SEARCH_URL}?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminProductListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProduct(productId: string): Promise<AdminProductResponse> {
    try {
      const res = await retrieve(`${PRODUCT_URL}/${productId}/admin`);
      if (!res.success) throw new Error(res.message);

      const product = res.data as AdminProductResponse;
      return product;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProductDetail(
    productId: string,
    query?: ProductDetailQuery
  ): Promise<AdminProductDetailResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.modelStopSelling !== undefined) {
        queryString.set("modelStopSelling", query.modelStopSelling);
      }
      if (query.variationStopSelling !== undefined) {
        queryString.set("variationStopSelling", query.variationStopSelling);
      }
    }

    try {
      const res = await retrieve(
        `${PRODUCT_URL}/${productId}/details/admin?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminProductDetailResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteProduct(productId: string): Promise<void> {
    try {
      const res = await remove(`${PRODUCT_URL}/${productId}`);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteProductBulk(data: ProductBulkDelete): Promise<void> {
    try {
      if (data.productIds.length === 0) {
        throw new Error("No products selected for deletion");
      }
      if (data.productIds.length > MAX_PRODUCTS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_PRODUCTS_TO_DELETE_BULK} products at once.`
        );
      }

      const res = await remove(`${PRODUCT_URL}/many`, null, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateProduct(
    productId: string,
    data: ProductUpdate
  ): Promise<ProductResponse> {
    try {
      const res = await patch(PRODUCT_URL, productId, data);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProductStore;
