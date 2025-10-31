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

  fetchOrderStates: () => Promise<OrderStateListResponse>;

  getOrderState: (id: string) => Promise<OrderStateResponse>;
  getOrderStateSync: (id: string) => OrderStateResponse | undefined;

  getOrderStateByLookupId: (lookupId: string) => Promise<OrderStateResponse>;
  getOrderStateByLookupIdSync: (
    lookupId: string
  ) => OrderStateResponse | undefined;
};

export const useOrderStateStore = create<OrderStateState>((set, get) => ({
  orderStates: null,

  async fetchOrderStates(): Promise<OrderStateListResponse> {
    const { orderStates } = get();
    if (orderStates) return orderStates;

    try {
      const res = await retrieve(ORDER_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const data = res.data as OrderStateListResponse;
      set({ orderStates: data });
      return data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getOrderState(id: string): Promise<OrderStateResponse> {
    const state = get().orderStates?.states.find((state) => state.id === id);
    if (state) return state;

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

  getOrderStateSync(id: string): OrderStateResponse | undefined {
    return get().orderStates?.states.find((state) => state.id === id);
  },

  async getOrderStateByLookupId(lookupId: string): Promise<OrderStateResponse> {
    const state = get().orderStates?.states.find(
      (state) => state.lookupId === lookupId
    );
    if (state) return state;

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

  getOrderStateByLookupIdSync(lookupId): OrderStateResponse | undefined {
    return get().orderStates?.states.find(
      (state) => state.lookupId === lookupId
    );
  },
}));
