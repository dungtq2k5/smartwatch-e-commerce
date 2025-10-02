import { create } from "zustand";
import type {
  StripeSetupIntentResponse,
  UserPaymentMethodCreate,
  UserPaymentMethodResponse,
  UserSelfPaymentMethodListResponse,
} from "../../../common/types.common";
import { formatError } from "../../../common/utils.common";
import { SELF_PAYMENT_METHOD_URL } from "../configs";
import { post, remove, retrieve } from "../utils/utils";

type UserPaymentMethodState = {
  paymentMethods: UserSelfPaymentMethodListResponse | null;

  fetchPaymentMethods: () => Promise<UserSelfPaymentMethodListResponse>;
  createPaymentMethod: (
    data: UserPaymentMethodCreate
  ) => Promise<UserPaymentMethodResponse>;
  createStripeSetupIntent: () => Promise<StripeSetupIntentResponse>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
};

export const useUserPaymentMethodStore = create<UserPaymentMethodState>(
  (set, get) => ({
    paymentMethods: null,

    async fetchPaymentMethods(): Promise<UserSelfPaymentMethodListResponse> {
      const { paymentMethods } = get();
      if (paymentMethods) return paymentMethods;

      try {
        const res = await retrieve(SELF_PAYMENT_METHOD_URL);
        if (!res.success) throw new Error(res.message);

        const paymentMethods = res.data as UserSelfPaymentMethodListResponse;
        set({ paymentMethods });
        return paymentMethods;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async createPaymentMethod(
      data: UserPaymentMethodCreate
    ): Promise<UserPaymentMethodResponse> {
      try {
        const res = await post(SELF_PAYMENT_METHOD_URL, data);
        if (!res.success) throw new Error(res.message);

        const newPaymentMethod = res.data as UserPaymentMethodResponse;

        const { paymentMethods } = get();
        if (paymentMethods) {
          set({
            paymentMethods: {
              ...paymentMethods,
              total: paymentMethods.total + 1,
              methods: [newPaymentMethod, ...paymentMethods.methods],
            },
          });
        }

        return newPaymentMethod;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async createStripeSetupIntent(): Promise<StripeSetupIntentResponse> {
      try {
        const res = await post(`${SELF_PAYMENT_METHOD_URL}/setup-intent`);
        if (!res.success) throw new Error(res.message);

        return res.data as StripeSetupIntentResponse;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async deletePaymentMethod(id: string): Promise<void> {
      try {
        const res = await remove(`${SELF_PAYMENT_METHOD_URL}/${id}`);
        if (!res.success) throw new Error(res.message);

        const { paymentMethods } = get();
        if (paymentMethods) {
          const updatedMethods = paymentMethods.methods;
          const methodIdxToRemove = updatedMethods.findIndex(
            (method) => method.id === id
          );
          if (methodIdxToRemove !== -1) {
            updatedMethods.splice(methodIdxToRemove, 1);
            set({
              paymentMethods: {
                ...paymentMethods,
                total: updatedMethods.length,
                methods: updatedMethods,
              },
            });
          }
        }
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async setDefaultPaymentMethod(id: string): Promise<void> {
      try {
        const res = await post(`${SELF_PAYMENT_METHOD_URL}/${id}/set-default`);
        if (!res.success) throw new Error(res.message);

        const updatedMethod = res.data as UserPaymentMethodResponse;
        const { paymentMethods } = get();
        if (paymentMethods) {
          const updatedMethods = paymentMethods.methods.map((method) => {
            if (method.id === id) return updatedMethod;
            if (method.isDefault) return { ...method, isDefault: false };
            return method;
          });
          set({
            paymentMethods: {
              ...paymentMethods,
              total: updatedMethods.length,
              methods: updatedMethods,
            },
          });
        }
      } catch (error) {
        throw new Error(formatError(error));
      }
    },
  })
);
