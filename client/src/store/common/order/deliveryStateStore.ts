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

  getDeliveryState: (id: string) => DeliveryStateResponse | undefined; // Should be pre-fetched first

  fetchDeliveryStates: () => Promise<DeliveryStateListResponse>;
  fetchDeliveryState: (id: string) => Promise<DeliveryStateResponse>;
};

const useDeliveryStateStore = create<DeliveryStateState>(
  (set, get) => ({
    deliveryStates: null,

    getDeliveryState(id: string): DeliveryStateResponse | undefined {
      return structuredClone(
        get().deliveryStates?.states.find((state) => state.id === id)
      );
    },

    async fetchDeliveryStates(): Promise<DeliveryStateListResponse> {
      const { deliveryStates } = get();
      if (deliveryStates) return structuredClone(deliveryStates);

      try {
        const res = await retrieve(DELIVERY_STATES_URL);
        if (!res.success) throw new Error(res.message);

        const states = res.data as DeliveryStateListResponse;
        set({ deliveryStates: states });
        return structuredClone(states);
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async fetchDeliveryState(id: string): Promise<DeliveryStateResponse> {
      const { deliveryStates } = get();
      if (deliveryStates) {
        const deliveryState = deliveryStates.states.find(
          (state) => state.id === id
        );
        if (deliveryState) return structuredClone(deliveryState);
      }

      try {
        const fetchedDeliveryStates = await get().fetchDeliveryStates();

        if (!fetchedDeliveryStates)
          throw new Error("Delivery states not found");
        const deliveryState = fetchedDeliveryStates.states.find(
          (state) => state.id === id
        );
        if (!deliveryState) throw new Error("Delivery state not found");

        return deliveryState;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },
  })
);

export default useDeliveryStateStore;
