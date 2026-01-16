import { create } from "zustand";
import type {
  AdminProductModelDetailsResponse,
  AdminProductModelListResponse,
  AdminProductModelResponse,
  ProductModelBulkDelete,
  ProductModelCreate,
  ProductModelDetailQuery,
  ProductModelResponse,
  ProductModelSearchQuery,
  ProductModelUpdate,
} from "../../../../../common/types.common";
import { patch, post, remove, retrieve } from "../../../utils/utils";
import { PRODUCT_MODEL_URL } from "../../../configs";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { MAX_PRODUCT_MODELS_TO_DELETE_BULK } from "../../../../../common/configs.common";

type ModelState = {
  fetchModels: (
    query?: ProductModelSearchQuery
  ) => Promise<AdminProductModelListResponse>;

  fetchModel: (modelId: string) => Promise<AdminProductModelResponse>;
  fetchModelLite: (modelId: string) => Promise<ProductModelResponse>; // Less detailed version than fetchModel
  fetchModelDetails: (
    modelId: string,
    query?: ProductModelDetailQuery
  ) => Promise<AdminProductModelDetailsResponse>;

  updateModel: (
    modelId: string,
    data: ProductModelUpdate
  ) => Promise<ProductModelResponse>;

  deleteModel: (modelId: string) => Promise<void>;
  deleteModelBulk: (data: ProductModelBulkDelete) => Promise<void>;

  createModel: (model: ProductModelCreate) => Promise<ProductModelResponse>;
};

const useModelStore = create<ModelState>(() => ({
  async fetchModels(
    query?: ProductModelSearchQuery
  ): Promise<AdminProductModelListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }

      if (query.priceCentsMin) {
        queryString.set("priceCentsMin", query.priceCentsMin);
      }
      if (query.priceCentsMax) {
        queryString.set("priceCentsMax", query.priceCentsMax);
      }
      if (
        query.priceCentsMin &&
        query.priceCentsMax &&
        Number.parseInt(query.priceCentsMin, 10) >
          Number.parseInt(query.priceCentsMax, 10)
      ) {
        throw new Error("Minimum price cannot be greater than maximum price");
      }

      if (query.stockPriceCentsMin) {
        queryString.set("stockPriceCentsMin", query.stockPriceCentsMin);
      }
      if (query.stockPriceCentsMax) {
        queryString.set("stockPriceCentsMax", query.stockPriceCentsMax);
      }
      if (
        query.stockPriceCentsMin &&
        query.stockPriceCentsMax &&
        Number.parseInt(query.stockPriceCentsMin, 10) >
          Number.parseInt(query.stockPriceCentsMax, 10)
      ) {
        throw new Error(
          "Minimum stock price cannot be greater than maximum stock price"
        );
      }

      if (query.releaseDateFrom) {
        queryString.set("releaseDateFrom", query.releaseDateFrom);
      }
      if (query.releaseDateTo) {
        queryString.set("releaseDateTo", query.releaseDateTo);
      }
      if (
        query.releaseDateFrom &&
        query.releaseDateTo &&
        new Date(query.releaseDateFrom) > new Date(query.releaseDateTo)
      ) {
        throw new Error("Release date 'from' cannot be later than 'to'");
      }

      if (query.stopSelling) queryString.set("stopSelling", query.stopSelling);
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(
        `${PRODUCT_MODEL_URL}/admin?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminProductModelListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchModel(modelId: string): Promise<AdminProductModelResponse> {
    try {
      const res = await retrieve(`${PRODUCT_MODEL_URL}/${modelId}/admin`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminProductModelResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchModelLite(modelId: string): Promise<ProductModelResponse> {
    try {
      const res = await retrieve(`${PRODUCT_MODEL_URL}/${modelId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductModelResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchModelDetails(
    modelId: string,
    query?: ProductModelDetailQuery
  ): Promise<AdminProductModelDetailsResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.variationStopSelling !== undefined) {
        queryString.set("variationStopSelling", query.variationStopSelling);
      }
    }

    try {
      const res = await retrieve(
        `${PRODUCT_MODEL_URL}/${modelId}/details/admin?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminProductModelDetailsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateModel(
    modelId: string,
    data: ProductModelUpdate
  ): Promise<ProductModelResponse> {
    try {
      const res = await patch(PRODUCT_MODEL_URL, modelId, data);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductModelResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteModel(modelId: string): Promise<void> {
    try {
      const res = await remove(`${PRODUCT_MODEL_URL}/${modelId}`);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteModelBulk(data: ProductModelBulkDelete): Promise<void> {
    try {
      if (data.modelIds.length === 0) {
        throw new Error("No models selected for deletion");
      }
      if (data.modelIds.length > MAX_PRODUCT_MODELS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_PRODUCT_MODELS_TO_DELETE_BULK} models at once`
        );
      }

      const res = await remove(`${PRODUCT_MODEL_URL}/bulk`, null, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createModel(model: ProductModelCreate): Promise<ProductModelResponse> {
    try {
      const res = await post(PRODUCT_MODEL_URL, model);
      if (!res.success) throw new Error(res.message);

      return res.data as ProductModelResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useModelStore;
