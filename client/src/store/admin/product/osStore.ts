import { create } from "zustand";
import type {
  AdminProductOsListResponse as AdminOsListResponse,
  AdminProductOsResponse as AdminOsResponse,
  ProductOsBulkDelete as OsBulkDelete,
  ProductOsSearchQuery as OsSearchQuery,
  ProductOsUpdate as OsUpdate,
  ProductOsCreate,
  ProductOsResponse,
} from "../../../../../common/types.common";
import { PRODUCT_OS_URL } from "../../../configs";
import { patch, post, remove, retrieve } from "../../../utils/utils";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { MAX_PRODUCT_OS_TO_DELETE_BULK } from "../../../../../common/configs.common";

type ProductOsState = {
  fetchOs: (osId: string) => Promise<AdminOsResponse>;
  fetchOses: (query?: OsSearchQuery) => Promise<AdminOsListResponse>;

  createOs: (osData: ProductOsCreate) => Promise<ProductOsResponse>;

  updateOs: (
    osId: string,
    osData: OsUpdate,
  ) => Promise<AdminOsResponse>;

  deleteOs: (osId: string) => Promise<void>;
  deleteOsBulk: (data: OsBulkDelete) => Promise<void>;
};

const useProductOsStore = create<ProductOsState>(() => ({
  async fetchOs(osId: string): Promise<AdminOsResponse> {
    try {
      const res = await retrieve(`${PRODUCT_OS_URL}/${osId}/admin`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOses(query?: OsSearchQuery): Promise<AdminOsListResponse> {
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
        `${PRODUCT_OS_URL}/admin?${queryString.toString()}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOsListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createOs(
    osData: ProductOsCreate,
  ): Promise<ProductOsResponse> {
    try {
      const res = await post(PRODUCT_OS_URL, osData);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductOsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateOs(
    osId: string,
    osData: OsUpdate,
  ): Promise<AdminOsResponse> {
    try {
      const res = await patch(PRODUCT_OS_URL, osId, osData);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteOs(osId: string): Promise<void> {
    try {
      const res = await remove(PRODUCT_OS_URL, osId);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteOsBulk(data: OsBulkDelete): Promise<void> {
    try {
      if (data.osIds.length === 0) {
        throw new Error("No OS selected for deletion.");
      }
      if (data.osIds.length > MAX_PRODUCT_OS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_PRODUCT_OS_TO_DELETE_BULK} OS at once.`,
        );
      }

      const res = await remove(`${PRODUCT_OS_URL}/many`, undefined, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useProductOsStore;
