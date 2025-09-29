import { create } from "zustand";
import type {
  ProductDetailQuery,
  ProductDetailResponse,
  ProductListResponse,
  ProductSearchQuery,
} from "../../../../common/types.common";
import { retrieve } from "../../utils/utils";
import { PRODUCT_SEARCH_URL, PRODUCT_URL } from "../../configs";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";

type ProductState = {
  fetchProducts: (query?: ProductSearchQuery) => Promise<ProductListResponse>;

  fetchProductDetail: (
    productId: string,
    query?: ProductDetailQuery
  ) => Promise<ProductDetailResponse>;
};

export const useProductStore = create<ProductState>(() => ({
  async fetchProducts(
    query?: ProductSearchQuery
  ): Promise<ProductListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.brandId) queryString.set("brandId", query.brandId);
      if (query.categoryId) queryString.set("categoryId", query.categoryId);
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
        `${PRODUCT_SEARCH_URL}?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProductDetail(
    productId: string,
    query?: ProductDetailQuery
  ): Promise<ProductDetailResponse> {
    try {
      const queryString = new URLSearchParams();

      if (query) {
        if (query.modelStopSelling) {
          queryString.set("modelStopSelling", query.modelStopSelling);
        }
        if (query.variationStopSelling) {
          queryString.set("variationStopSelling", query.variationStopSelling);
        }
      }

      const res = await retrieve(
        `${PRODUCT_URL}/${productId}/details?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as ProductDetailResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
