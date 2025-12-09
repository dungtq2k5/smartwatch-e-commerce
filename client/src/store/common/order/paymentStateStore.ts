import { create } from "zustand";
import type {
  PaymentStateListResponse,
  PaymentStateResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { PAYMENT_STATES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";

type PaymentStateState = {
  paymentStates: PaymentStateListResponse | null;

  getPaymentState: (id: string) => PaymentStateResponse | undefined;

  fetchPaymentStates: () => Promise<PaymentStateListResponse | undefined>;
};

const usePaymentStateStore = create<PaymentStateState>((set, get) => ({
  paymentStates: null,

  getPaymentState(id: string): PaymentStateResponse | undefined {
    return structuredClone(
      get().paymentStates?.states.find((state) => state.id === id)
    );
  },

  async fetchPaymentStates(): Promise<PaymentStateListResponse | undefined> {
    const { paymentStates } = get();
    if (paymentStates) return structuredClone(paymentStates);

    try {
      const res = await retrieve(PAYMENT_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const states = res.data as PaymentStateListResponse;
      set({ paymentStates: states });
      return structuredClone(states);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default usePaymentStateStore;
