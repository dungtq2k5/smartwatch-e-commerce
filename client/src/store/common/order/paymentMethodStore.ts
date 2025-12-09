import { create } from "zustand";
import type {
  PaymentMethodListResponse,
  PaymentMethodResponse,
} from "../../../../../common/types.common";
import { PAYMENT_METHODS_URL } from "../../../configs";
import { retrieve } from "../../../utils/utils";
import { formatError } from "../../../../../common/utils.common";

type PaymentMethodState = {
  paymentMethods: PaymentMethodListResponse | null;

  getPaymentMethod: (id: string) => PaymentMethodResponse | undefined;

  fetchPaymentMethods: () => Promise<PaymentMethodListResponse>;
  fetchPaymentMethod: (id: string) => Promise<PaymentMethodResponse>;
};

const usePaymentMethodStore = create<PaymentMethodState>((set, get) => ({
  paymentMethods: null,

  getPaymentMethod(id: string): PaymentMethodResponse | undefined {
    return structuredClone(
      get().paymentMethods?.methods.find((method) => method.id === id)
    );
  },

  async fetchPaymentMethods(): Promise<PaymentMethodListResponse> {
    const { paymentMethods } = get();
    if (paymentMethods) return structuredClone(paymentMethods);

    try {
      const res = await retrieve(PAYMENT_METHODS_URL);
      if (!res.success) throw new Error(res.message);

      const methods = res.data as PaymentMethodListResponse;
      set({ paymentMethods: methods });
      return structuredClone(methods);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchPaymentMethod(id: string): Promise<PaymentMethodResponse> {
    const method = get().paymentMethods?.methods.find(
      (method) => method.id === id
    );
    if (method) return structuredClone(method);

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
}));

export default usePaymentMethodStore;
