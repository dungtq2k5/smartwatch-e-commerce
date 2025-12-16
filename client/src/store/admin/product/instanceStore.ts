import { create } from "zustand";
import type {
  VariationInstanceListResponse,
  VariationInstanceSearchQuery,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { VARIATION_INSTANCE_URL } from "../../../configs";
import { retrieve } from "../../../utils/utils";

type InstanceState = {
  fetchInstances: (
    query?: VariationInstanceSearchQuery
  ) => Promise<VariationInstanceListResponse>;
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
}));

export default useInstanceStore;
