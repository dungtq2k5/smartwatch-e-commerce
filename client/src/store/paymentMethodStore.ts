import { create } from "zustand";
import type { PaymentMethodListResponse } from "../../../common/types.common";
import { PAYMENT_METHODS_URL } from "../configs";
import { formatError, retrieve } from "../utils/utils";

type PaymentMethodState = {
  paymentMethods?: PaymentMethodListResponse;
  isFetching?: true;
  fetchErr?: string;

  fetchPaymentMethods: () => Promise<PaymentMethodListResponse | undefined>;
};

export const usePaymentMethodStore = create<PaymentMethodState>((set, get) => ({
  // paymentMethods: { // DEV temp data for testing
  //   total: 3,
  //   methods: [
  //     {
  //       id: "689d60267631ccf8606dbbdc",
  //       name: "cash",
  //       description: "Cash on Delivery (COD)",
  //     },
  //     {
  //       id: "689d60267631ccf8606dbbdd",
  //       name: "stripe",
  //       description: "Online payment via Stripe",
  //     },
  //     {
  //       id: "689d60267631ccf8606dbbde",
  //       name: "user balance",
  //       description: "Payment using user's account balance",
  //     },
  //   ],
  // },
  paymentMethods: undefined,
  isFetching: undefined,
  fetchErr: undefined,

  async fetchPaymentMethods(): Promise<PaymentMethodListResponse | undefined> {
    const { paymentMethods } = get();
    if (paymentMethods) return paymentMethods;

    set({ isFetching: true, fetchErr: undefined });
    try {
      const res = await retrieve(PAYMENT_METHODS_URL);
      if (!res.success) {
        set({ fetchErr: res.message });
        return;
      }

      const data = res.data as PaymentMethodListResponse;
      set({ paymentMethods: data });
      return data;
    } catch (error) {
      set({ fetchErr: formatError(error) });
    } finally {
      set({ isFetching: undefined });
    }
  },
}));
