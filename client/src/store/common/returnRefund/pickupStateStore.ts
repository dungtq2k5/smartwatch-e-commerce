import { create } from "zustand";
import type {
  PickupStateListResponse,
  PickupStateResponse,
} from "../../../../../common/types.common";
import { formatError } from "../../../../../common/utils.common";
import { PICKUP_STATES_URL } from "../../../configs";
import { retrieve } from "../../../utils/utils";

type PickupStateState = {
  pickupStates: PickupStateListResponse | null;

  getPickupState: (id: string) => PickupStateResponse | undefined;
  getPickupStateByLookupId: (
    lookupId: string,
  ) => PickupStateResponse | undefined;

  fetchPickupStates: () => Promise<PickupStateListResponse>;
};

const usePickupStateStore = create<PickupStateState>((set, get) => ({
  pickupStates: null,

  getPickupState(id: string): PickupStateResponse | undefined {
    return structuredClone(
      get().pickupStates?.states.find((state) => state.id === id),
    );
  },

  getPickupStateByLookupId(lookupId): PickupStateResponse | undefined {
    return structuredClone(
      get().pickupStates?.states.find((state) => state.lookupId === lookupId),
    );
  },

  async fetchPickupStates(): Promise<PickupStateListResponse> {
    const { pickupStates } = get();
    if (pickupStates) return structuredClone(pickupStates);

    try {
      const res = await retrieve(PICKUP_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const states = res.data as PickupStateListResponse;
      set({ pickupStates: states });
      return structuredClone(states);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default usePickupStateStore;
