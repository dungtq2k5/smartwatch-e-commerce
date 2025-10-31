import { create } from "zustand";
import type {
  ReturnStateListResponse,
  ReturnStateResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { RETURN_STATES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type ReturnStateState = {
  returnStates: ReturnStateListResponse | null;

  fetchReturnStates: () => Promise<ReturnStateListResponse>;

  getReturnState: (id: string) => Promise<ReturnStateResponse>;
  getReturnStateSync: (id: string) => ReturnStateResponse | undefined;

  getReturnStateByLookupId: (lookupId: string) => Promise<ReturnStateResponse>;
  getReturnStateByLookupIdSync: (
    lookupId: string
  ) => ReturnStateResponse | undefined;
};

export const useReturnStateStore = create<ReturnStateState>((set, get) => ({
  returnStates: null,

  async fetchReturnStates(): Promise<ReturnStateListResponse> {
    const { returnStates } = get();
    if (returnStates) return returnStates;

    try {
      const res = await retrieve(RETURN_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const returnState = res.data as ReturnStateListResponse;
      set({ returnStates: returnState });
      return returnState;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getReturnState(id: string): Promise<ReturnStateResponse> {
    try {
      const state = get().returnStates?.states.find((state) => state.id === id);
      if (state) return state;

      try {
        const fetchedReturnStates = await get().fetchReturnStates();
        const foundState = fetchedReturnStates?.states.find(
          (state) => state.id === id
        );

        if (!foundState) throw new Error("Return state not found");
        return foundState;
      } catch (error) {
        throw new Error(formatError(error));
      }
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  // Must be pre-fetched to use
  getReturnStateSync(id: string): ReturnStateResponse | undefined {
    return get().returnStates?.states.find((state) => state.id === id);
  },

  async getReturnStateByLookupId(
    lookupId: string
  ): Promise<ReturnStateResponse> {
    const state = get().returnStates?.states.find(
      (state) => state.lookupId === lookupId
    );
    if (state) return state;

    try {
      const fetchedReturnStates = await get().fetchReturnStates();
      const foundState = fetchedReturnStates?.states.find(
        (state) => state.lookupId === lookupId
      );

      if (!foundState) throw new Error("Return state not found");
      return foundState;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  // Must be pre-fetched to use
  getReturnStateByLookupIdSync(
    lookupId: string
  ): ReturnStateResponse | undefined {
    return get().returnStates?.states.find(
      (state) => state.lookupId === lookupId
    );
  },
}));
