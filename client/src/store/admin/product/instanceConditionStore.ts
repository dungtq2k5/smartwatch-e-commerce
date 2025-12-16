import { create } from "zustand";
import type {
  InstanceConditionListResponse,
  InstanceConditionResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { INSTANCE_CONDITION_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type InstanceConditionState = {
  instanceConditions: InstanceConditionListResponse | null;

  getInstanceCondition: (id: string) => InstanceConditionResponse | undefined;
  getInstanceConditionByLookupId: (
    lookupId: string
  ) => InstanceConditionResponse | undefined;

  fetchInstanceConditions: () => Promise<InstanceConditionListResponse>;
};

const useInstanceConditionStore = create<InstanceConditionState>(
  (set, get) => ({
    instanceConditions: null,

    getInstanceCondition(id: string): InstanceConditionResponse | undefined {
      return structuredClone(
        get().instanceConditions?.conditions.find(
          (condition) => condition.id === id
        )
      );
    },

    getInstanceConditionByLookupId(
      lookupId
    ): InstanceConditionResponse | undefined {
      return structuredClone(
        get().instanceConditions?.conditions.find(
          (condition) => condition.lookupId === lookupId
        )
      );
    },

    async fetchInstanceConditions(): Promise<InstanceConditionListResponse> {
      const { instanceConditions } = get();
      if (instanceConditions) return structuredClone(instanceConditions);

      try {
        const res = await retrieve(`${INSTANCE_CONDITION_URL}`);
        if (!res.success) throw new Error(res.message);

        const conditions = res.data as InstanceConditionListResponse;
        set({ instanceConditions: conditions });
        return structuredClone(conditions);
      } catch (error) {
        throw new Error(formatError(error));
      }
    },
  })
);

export default useInstanceConditionStore;
