import { create } from "zustand";
import type {
  PaymentMethodListResponse,
  PaymentMethodResponse,
} from "../../../../common/types.common";
import { PAYMENT_METHODS_URL } from "../../configs";
import { retrieve } from "../../utils/utils";
import { formatError } from "../../../../common/utils.common";

type PaymentMethodState = {
  paymentMethods?: PaymentMethodListResponse;

  fetchPaymentMethods: () => Promise<PaymentMethodListResponse>;

  getPaymentMethod: (id: string) => Promise<PaymentMethodResponse>;
  getPaymentMethodSync: (id: string) => PaymentMethodResponse | undefined;
};

export const usePaymentMethodStore = create<PaymentMethodState>((set, get) => ({
  paymentMethods: undefined,

  async fetchPaymentMethods(): Promise<PaymentMethodListResponse> {
    const { paymentMethods } = get();
    if (paymentMethods) return paymentMethods;

    try {
      const res = await retrieve(PAYMENT_METHODS_URL);
      if (!res.success) throw new Error(res.message);

      const data = res.data as PaymentMethodListResponse;
      set({ paymentMethods: data });
      return data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getPaymentMethod(id: string): Promise<PaymentMethodResponse> {
    const method = get().paymentMethods?.methods.find(
      (method) => method.id === id
    );
    if (method) return method;

    try {
      const fetchedMethods = await get().fetchPaymentMethods();

      const method = fetchedMethods.methods.find((method) => method.id === id);
      if (!method) {
        throw new Error(`Payment method with id ${id} not found`);
      }
      
      return method;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getPaymentMethodSync(id: string): PaymentMethodResponse | undefined {
    return get().paymentMethods?.methods.find((method) => method.id === id);
  },
}));
