import { create } from "zustand";
import type {
  OrderStateListResponse,
  OrderStateResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { ORDER_STATES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type OrderStateState = {
  orderStates: OrderStateListResponse | null;

  getOrderState: (id: string) => OrderStateResponse | undefined;
  getOrderStateByLookupId: (lookupId: string) => OrderStateResponse | undefined;

  fetchOrderStates: () => Promise<OrderStateListResponse>;
  fetchOrderState: (id: string) => Promise<OrderStateResponse>;
  fetchOrderStateByLookupId: (lookupId: string) => Promise<OrderStateResponse>;
};

const useOrderStateStore = create<OrderStateState>((set, get) => ({
  orderStates: null,

  getOrderState(id: string): OrderStateResponse | undefined {
    return structuredClone(
      get().orderStates?.states.find((state) => state.id === id)
    );
  },

  getOrderStateByLookupId(lookupId): OrderStateResponse | undefined {
    return structuredClone(
      get().orderStates?.states.find((state) => state.lookupId === lookupId)
    );
  },

  async fetchOrderStates(): Promise<OrderStateListResponse> {
    const { orderStates } = get();
    if (orderStates) return structuredClone(orderStates);

    try {
      const res = await retrieve(ORDER_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const states = res.data as OrderStateListResponse;
      set({ orderStates: states });
      return structuredClone(states);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrderState(id: string): Promise<OrderStateResponse> {
    const state = get().orderStates?.states.find((state) => state.id === id);
    if (state) return structuredClone(state);

    try {
      const fetchedStates = await get().fetchOrderStates();
      const state = fetchedStates.states.find((state) => state.id === id);
      if (!state) {
        throw new Error(`Order state with id ${id} not found`);
      }
      return state;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrderStateByLookupId(
    lookupId: string
  ): Promise<OrderStateResponse> {
    const state = get().orderStates?.states.find(
      (state) => state.lookupId === lookupId
    );
    if (state) return structuredClone(state);

    try {
      const fetchedStates = await get().fetchOrderStates();
      const state = fetchedStates.states.find(
        (state) => state.lookupId === lookupId
      );

      if (!state) {
        throw new Error(`Order state with lookupId ${lookupId} not found`);
      }
      return state;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useOrderStateStore;
