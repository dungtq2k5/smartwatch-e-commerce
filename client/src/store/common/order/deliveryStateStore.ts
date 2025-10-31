import { create } from "zustand";
import type {
  DeliveryStateListResponse,
  DeliveryStateResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { DELIVERY_STATES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type DeliveryStateState = {
  deliveryStates: DeliveryStateListResponse | null;

  fetchDeliveryStates: () => Promise<DeliveryStateListResponse>;
  getDeliveryState: (id: string) => Promise<DeliveryStateResponse>;
  getDeliveryStateSync: (id: string) => DeliveryStateResponse | undefined; // Should be pre-fetched first
};

export const useDeliveryStateStore = create<DeliveryStateState>((set, get) => ({
  deliveryStates: null,

  async fetchDeliveryStates(): Promise<DeliveryStateListResponse> {
    const { deliveryStates } = get();
    if (deliveryStates) return deliveryStates;

    try {
      const res = await retrieve(DELIVERY_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const data = res.data as DeliveryStateListResponse;
      set({ deliveryStates: data });
      return data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getDeliveryState(id: string): Promise<DeliveryStateResponse> {
    try {
      const { deliveryStates } = get();
      if (deliveryStates) {
        const deliveryState = deliveryStates.states.find(
          (state) => state.id === id
        );
        if (deliveryState) return deliveryState;
      }

      const fetchedDeliveryStates = await get().fetchDeliveryStates();

      if (!fetchedDeliveryStates) throw new Error("Delivery states not found");
      const deliveryState = fetchedDeliveryStates.states.find(
        (state) => state.id === id
      );
      if (!deliveryState) throw new Error("Delivery state not found");
      return deliveryState;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getDeliveryStateSync(id: string): DeliveryStateResponse | undefined {
    return get().deliveryStates?.states.find((state) => state.id === id);
  },
}));
