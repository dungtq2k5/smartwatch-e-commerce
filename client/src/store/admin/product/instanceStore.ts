import { create } from "zustand";
import type {
  VariationInstanceCreate,
  VariationInstanceListResponse,
  VariationInstanceResponse,
  VariationInstanceSearchQuery,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { VARIATION_INSTANCE_URL } from "../../../configs";
import { post, retrieve } from "../../../utils/utils";

type InstanceState = {
  fetchInstances: (
    query?: VariationInstanceSearchQuery
  ) => Promise<VariationInstanceListResponse>;

  createInstance: (
    instance: VariationInstanceCreate
  ) => Promise<VariationInstanceResponse>;
};

const useInstanceStore = create<InstanceState>(() => ({
  async fetchInstances(
    query?: VariationInstanceSearchQuery
  ): Promise<VariationInstanceListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.conditionId) queryString.set("conditionId", query.conditionId);
      if (query.isActive) queryString.set("isActive", query.isActive);
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(
        `${VARIATION_INSTANCE_URL}/admin?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as VariationInstanceListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createInstance(
    instance: VariationInstanceCreate
  ): Promise<VariationInstanceResponse> {
    try {
      const res = await post(VARIATION_INSTANCE_URL, instance);
      if (!res.success) throw new Error(res.message);

      return res.data as VariationInstanceResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useInstanceStore;
