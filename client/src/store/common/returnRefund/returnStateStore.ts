import { create } from "zustand";
import type {
  ReturnStateListResponse,
  ReturnStateResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { ORDER_RETURN_STATES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type ReturnStateState = {
  returnStates: ReturnStateListResponse | null;

  getReturnState: (id: string) => ReturnStateResponse | undefined;
  getReturnStateByLookupId: (
    lookupId: string
  ) => ReturnStateResponse | undefined;

  fetchReturnStates: () => Promise<ReturnStateListResponse>;
  fetchReturnState: (id: string) => Promise<ReturnStateResponse>;
  fetchReturnStateByLookupId: (
    lookupId: string
  ) => Promise<ReturnStateResponse>;
};

const useReturnStateStore = create<ReturnStateState>((set, get) => ({
  returnStates: null,

  // Must be pre-fetched to use
  getReturnState(id: string): ReturnStateResponse | undefined {
    return structuredClone(
      get().returnStates?.states.find((state) => state.id === id)
    );
  },

  // Must be pre-fetched to use
  getReturnStateByLookupId(lookupId: string): ReturnStateResponse | undefined {
    return structuredClone(
      get().returnStates?.states.find((state) => state.lookupId === lookupId)
    );
  },

  async fetchReturnStates(): Promise<ReturnStateListResponse> {
    const { returnStates } = get();
    if (returnStates) return structuredClone(returnStates);

    try {
      const res = await retrieve(ORDER_RETURN_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const returnState = res.data as ReturnStateListResponse;
      set({ returnStates: returnState });
      return structuredClone(returnState);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchReturnState(id: string): Promise<ReturnStateResponse> {
    try {
      const state = get().returnStates?.states.find((state) => state.id === id);
      if (state) return structuredClone(state);

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

  async fetchReturnStateByLookupId(
    lookupId: string
  ): Promise<ReturnStateResponse> {
    const state = get().returnStates?.states.find(
      (state) => state.lookupId === lookupId
    );
    if (state) return structuredClone(state);

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
}));

export default useReturnStateStore;
