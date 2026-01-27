import { create } from "zustand";
import type {
  AdminProductBrandListResponse as AdminBrandListResponse,
  AdminProductBrandResponse as AdminBrandResponse,
  ProductBrandBulkDelete as BrandBulkDelete,
  ProductBrandSearchQuery as BrandSearchQuery,
  ProductBrandUpdate as BrandUpdate,
  ProductBrandCreate,
  ProductBrandResponse,
} from "../../../../../common/types.common";
import { PRODUCT_BRANDS_URL } from "../../../configs";
import { patch, post, remove, retrieve } from "../../../utils/utils";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { MAX_PRODUCT_BRANDS_TO_DELETE_BULK } from "../../../../../common/configs.common";

type ProductBrandState = {
  fetchBrand: (brandId: string) => Promise<AdminBrandResponse>;
  fetchBrands: (query?: BrandSearchQuery) => Promise<AdminBrandListResponse>;

  createBrand: (brandData: ProductBrandCreate) => Promise<ProductBrandResponse>;

  updateBrand: (
    brandId: string,
    brandData: BrandUpdate,
  ) => Promise<AdminBrandResponse>;

  deleteBrand: (brandId: string) => Promise<void>;
  deleteBrandBulk: (data: BrandBulkDelete) => Promise<void>;
};

const useProductBrandStore = create<ProductBrandState>(() => ({
  async fetchBrand(brandId: string): Promise<AdminBrandResponse> {
    try {
      const res = await retrieve(`${PRODUCT_BRANDS_URL}/${brandId}/admin`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminBrandResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchBrands(query?: BrandSearchQuery): Promise<AdminBrandListResponse> {
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
        `${PRODUCT_BRANDS_URL}/admin?${queryString.toString()}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminBrandListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createBrand(
    brandData: ProductBrandCreate,
  ): Promise<ProductBrandResponse> {
    try {
      const res = await post(PRODUCT_BRANDS_URL, brandData);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductBrandResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateBrand(
    brandId: string,
    brandData: BrandUpdate,
  ): Promise<AdminBrandResponse> {
    try {
      const res = await patch(PRODUCT_BRANDS_URL, brandId, brandData);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminBrandResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteBrand(brandId: string): Promise<void> {
    try {
      const res = await remove(PRODUCT_BRANDS_URL, brandId);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteBrandBulk(data: BrandBulkDelete): Promise<void> {
    try {
      if (data.brandIds.length === 0) {
        throw new Error("No brands selected for deletion.");
      }
      if (data.brandIds.length > MAX_PRODUCT_BRANDS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_PRODUCT_BRANDS_TO_DELETE_BULK} brands at once.`,
        );
      }

      const res = await remove(`${PRODUCT_BRANDS_URL}/many`, undefined, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProductBrandStore;
