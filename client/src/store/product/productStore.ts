import { create } from "zustand";
import type {
  ProductListResponse,
  ProductSearchQuery,
} from "../../../../common/types.common";
import { formatError, retrieve } from "../../utils/utils";
import { PRODUCT_SEARCH_URL } from "../../configs";
import { removeOddSpaces } from "../../../../common/utils.common";

type ProductState = {
  fetchProducts: (query: ProductSearchQuery) => Promise<ProductListResponse>;
};

export const useProductStore = create<ProductState>(() => ({
  async fetchProducts(query: ProductSearchQuery): Promise<ProductListResponse> {
    try {
      const queryString = new URLSearchParams();
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) queryString.set("searchTerm", query.searchTerm);
      if (query.brandId) queryString.set("brandId", query.brandId);
      if (query.categoryId) queryString.set("categoryId", query.categoryId);
      if (query.stopSelling) queryString.set("stopSelling", query.stopSelling);
      if (query.priceCentsMin) queryString.set("priceCentsMin", query.priceCentsMin);
      if (query.priceCentsMax) queryString.set("priceCentsMax", query.priceCentsMax);
      if (query.sortBy) queryString.set("sortBy", query.sortBy);

      const res = await retrieve(
        `${PRODUCT_SEARCH_URL}?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

