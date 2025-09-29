import { create } from "zustand";
import type {
  PaymentStateListResponse,
  PaymentStateResponse,
} from "../../../../common/types.common";
import { retrieve } from "../../utils/utils";
import { PAYMENT_STATES_URL } from "../../configs";
import { formatError } from "../../../../common/utils.common";

type PaymentStateState = {
  paymentStates?: PaymentStateListResponse;

  fetchPaymentStates: () => Promise<PaymentStateListResponse | undefined>;
  getPaymentState: (id: string) => PaymentStateResponse | undefined;
};

export const usePaymentStateStore = create<PaymentStateState>((set, get) => ({
  paymentStates: undefined,

  async fetchPaymentStates(): Promise<PaymentStateListResponse | undefined> {
    const { paymentStates } = get();
    if (paymentStates) return paymentStates;

    try {
      const res = await retrieve(PAYMENT_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const data = res.data as PaymentStateListResponse;
      set({ paymentStates: data });
      return data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getPaymentState(id: string): PaymentStateResponse | undefined {
    return get().paymentStates?.states.find((state) => state.id === id);
  },
}));
