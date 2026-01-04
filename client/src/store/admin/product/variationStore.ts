import { create } from "zustand";
import type {
  AdminModelVariationListResponse,
  ModelVariationBulkDelete,
  ModelVariationCreate,
  ModelVariationResponse,
  ModelVariationSearchQuery,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { post, remove, retrieve } from "../../../utils/utils";
import { MODEL_VARIATION_URL } from "../../../configs";
import { MAX_MODEL_VARIATIONS_TO_DELETE_BULK } from "../../../../../common/configs.common";

type VariationState = {
  fetchVariationLite: (variationId: string) => Promise<ModelVariationResponse>; // Less detailed version than fetchVariation
  fetchVariations: (
    query?: ModelVariationSearchQuery
  ) => Promise<AdminModelVariationListResponse>;

  deleteVariation: (variationId: string) => Promise<void>;
  deleteVariationBulk: (data: ModelVariationBulkDelete) => Promise<void>;

  createVariation: (
    variation: ModelVariationCreate
  ) => Promise<ModelVariationResponse>;
};

const useVariationStore = create<VariationState>(() => ({
  async fetchVariationLite(
    variationId: string
  ): Promise<ModelVariationResponse> {
    try {
      const res = await retrieve(`${MODEL_VARIATION_URL}/${variationId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as ModelVariationResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchVariations(
    query?: ModelVariationSearchQuery
  ): Promise<AdminModelVariationListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }

      if (query.additionalPriceCentsMin) {
        queryString.set(
          "additionalPriceCentsMin",
          query.additionalPriceCentsMin
        );
      }
      if (query.additionalPriceCentsMax) {
        queryString.set(
          "additionalPriceCentsMax",
          query.additionalPriceCentsMax
        );
      }
      if (
        query.additionalPriceCentsMin &&
        query.additionalPriceCentsMax &&
        Number.parseInt(query.additionalPriceCentsMin, 10) >
          Number.parseInt(query.additionalPriceCentsMax, 10)
      ) {
        throw new Error("Minimum price cannot be greater than maximum price");
      }

      if (query.stockAdditionalPriceCentsMin) {
        queryString.set(
          "stockAdditionalPriceCentsMin",
          query.stockAdditionalPriceCentsMin
        );
      }
      if (query.stockAdditionalPriceCentsMax) {
        queryString.set(
          "stockAdditionalPriceCentsMax",
          query.stockAdditionalPriceCentsMax
        );
      }
      if (
        query.stockAdditionalPriceCentsMin &&
        query.stockAdditionalPriceCentsMax &&
        Number.parseInt(query.stockAdditionalPriceCentsMin, 10) >
          Number.parseInt(query.stockAdditionalPriceCentsMax, 10)
      ) {
        throw new Error(
          "Minimum stock price cannot be greater than maximum stock price"
        );
      }

      if (query.stopSelling) queryString.set("stopSelling", query.stopSelling);
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(
        `${MODEL_VARIATION_URL}/admin?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminModelVariationListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteVariation(variationId: string): Promise<void> {
    try {
      const res = await remove(`${MODEL_VARIATION_URL}/${variationId}`);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteVariationBulk(data: ModelVariationBulkDelete): Promise<void> {
    try {
      if (data.variationIds.length === 0) {
        throw new Error("No variations selected for deletion");
      }
      if (data.variationIds.length > MAX_MODEL_VARIATIONS_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_MODEL_VARIATIONS_TO_DELETE_BULK} variations at once`
        );
      }

      const res = await remove(`${MODEL_VARIATION_URL}/bulk`, null, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createVariation(
    variation: ModelVariationCreate
  ): Promise<ModelVariationResponse> {
    try {
      const res = await post(MODEL_VARIATION_URL, variation);
      if (!res.success) throw new Error(res.message);

      return res.data as ModelVariationResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useVariationStore;
