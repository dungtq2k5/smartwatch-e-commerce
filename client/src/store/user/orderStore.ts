import { create } from "zustand";
import type {
  CheckoutSessionResponse,
  OrderCreate,
  OrderDetailsResponse,
  OrderListResponse,
  OrderResponse,
  OrderReturnResponse,
  OrderSearchQuery,
  OrderSelfUpdate,
} from "../../../../common/types.common";
import { patch, post, retrieve } from "../../utils/utils";
import { SELF_ORDER_URL, ORDER_URL } from "../../configs";
import { LOOKUP_ID } from "../../../../common/configs.common";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";

type OrderState = {
  orderCache: OrderResponse | null;
  orderDetailCache: OrderDetailsResponse | null;

  createCheckoutSession: (orderId: string) => Promise<CheckoutSessionResponse>;

  createOrder: (order: OrderCreate) => Promise<OrderResponse>;

  fetchOrders: (
    query?: OrderSearchQuery,
    signal?: AbortSignal,
  ) => Promise<OrderListResponse>;
  fetchOrder: (id: string) => Promise<OrderResponse>;
  fetchOrderDetails: (id: string) => Promise<OrderDetailsResponse>;

  checkItemIsReturned: (item: OrderResponse["items"][0]) => boolean;
  checkItemAvailable: (
    item: OrderResponse["items"][0] | OrderReturnResponse["items"][0],
  ) => boolean;
  updateSelfOrder: (
    id: string,
    data: OrderSelfUpdate,
  ) => Promise<OrderResponse>;

  canSubmitOrder: (orderStateLookupId: string) => boolean;
  canReturnOrder: (
    order: OrderResponse | OrderDetailsResponse,
    orderStateLookupId: string,
  ) => boolean;
  canCancelOrder: (orderStateLookupId: string) => boolean;
  canBuyAgainOrder: (
    order: OrderResponse | OrderDetailsResponse,
    orderStateLookupId: string,
  ) => boolean;
  canPay: (
    orderStateLookupId: string,
    paymentMethodLookupId: string,
  ) => boolean;
  canChangeDeliveryAddress: (orderStateLookupId: string) => boolean;
};

const useOrderStoreInternal = create<OrderState>((set, get) => ({
  orderCache: null,
  orderDetailCache: null,

  async createCheckoutSession(
    orderId: string,
  ): Promise<CheckoutSessionResponse> {
    try {
      const res = await post(`${ORDER_URL}/${orderId}/create-checkout-session`);
      if (!res.success) throw new Error(res.message);

      return res.data as CheckoutSessionResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createOrder(order: OrderCreate): Promise<OrderResponse> {
    try {
      const res = await post(SELF_ORDER_URL, order);
      if (!res.success) throw new Error(res.message);

      return res.data as OrderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrders(
    query?: OrderSearchQuery,
    signal?: AbortSignal,
  ): Promise<OrderListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.deliveryStateIds?.length) {
        for (const id of query.deliveryStateIds) {
          queryString.append("deliveryStateId", id);
        }
      }
      if (query.paymentStateIds?.length) {
        for (const id of query.paymentStateIds) {
          queryString.append("paymentStateId", id);
        }
      }
      if (query.stateIds?.length) {
        for (const id of query.stateIds) {
          queryString.append("stateId", id);
        }
      }
    }

    try {
      const res = await retrieve(
        `${SELF_ORDER_URL}?${queryString.toString()}`,
        signal,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as OrderListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrder(id: string): Promise<OrderResponse> {
    const { orderCache } = get();
    if (orderCache?.id === id) return structuredClone(orderCache);

    try {
      const res = await retrieve(`${SELF_ORDER_URL}/${id}`);
      if (!res.success) throw new Error(res.message);

      const order = res.data as OrderResponse;
      set({ orderCache: order });
      return structuredClone(order);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrderDetails(id: string): Promise<OrderDetailsResponse> {
    const { orderDetailCache } = get();
    if (orderDetailCache?.id === id) return structuredClone(orderDetailCache);

    try {
      const res = await retrieve(`${SELF_ORDER_URL}/${id}/details`);
      if (!res.success) throw new Error(res.message);

      const orderDetail = res.data as OrderDetailsResponse;
      set({ orderDetailCache: orderDetail });
      return structuredClone(orderDetail);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  checkItemIsReturned(item: OrderResponse["items"][0]): boolean {
    return item.instances.some((i) =>
      ["return pending", "returned"].includes(i.state),
    );
  },

  checkItemAvailable(
    item: OrderResponse["items"][0] | OrderReturnResponse["items"][0],
  ): boolean {
    const variation = item.variation;
    const model = variation.productModel;
    const product = model.product;

    return (
      variation.stockQuantity > 0 &&
      !variation.stopSelling &&
      !variation.isDeleted &&
      !model.stopSelling &&
      !model.isDeleted &&
      !product.stopSelling &&
      !product.isDeleted
    );
  },

  async updateSelfOrder(
    id: string,
    data: OrderSelfUpdate,
  ): Promise<OrderResponse> {
    try {
      const res = await patch(SELF_ORDER_URL, id, data);
      if (!res.success) throw new Error(res.message);

      const updatedOrder = res.data as OrderResponse;
      set({ orderCache: updatedOrder });
      return structuredClone(updatedOrder);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  canSubmitOrder(orderStateLookupId: string): boolean {
    return orderStateLookupId === LOOKUP_ID.ORDER_STATE.DELIVERED; // delivered
  },

  canReturnOrder(
    order: OrderResponse | OrderDetailsResponse,
    orderStateLookupId: string,
  ): boolean {
    return (
      order.canReturn &&
      (
        [
          LOOKUP_ID.ORDER_STATE.DELIVERED,
          LOOKUP_ID.ORDER_STATE.COMPLETED,
        ] as string[]
      ).includes(orderStateLookupId || "") && // delivered, completed
      order.items.some((item) =>
        item.instances.some((inst) => inst.state === "ordered"),
      ) // At least one item is in "ordered" state -> can return
    );
  },

  canCancelOrder(orderStateLookupId: string): boolean {
    return (
      [
        LOOKUP_ID.ORDER_STATE.PENDING,
        LOOKUP_ID.ORDER_STATE.CONFIRMED,
      ] as string[]
    ).includes(orderStateLookupId); // pending, confirmed
  },

  canBuyAgainOrder(
    order: OrderResponse | OrderDetailsResponse,
    orderStateLookupId: string,
  ): boolean {
    const availableItems = order.items.filter(get().checkItemAvailable);
    return (
      orderStateLookupId === LOOKUP_ID.ORDER_STATE.COMPLETED && // completed
      availableItems.length > 0 // At least one item is available
    );
  },

  canPay(orderStateLookupId: string, paymentMethodLookupId: string): boolean {
    return (
      orderStateLookupId === LOOKUP_ID.ORDER_STATE.PENDING && // pending
      paymentMethodLookupId === LOOKUP_ID.PAYMENT_METHOD.STRIPE // stripe
    );
  },

  canChangeDeliveryAddress(orderStateLookupId: string): boolean {
    return (
      [
        LOOKUP_ID.ORDER_STATE.PENDING,
        LOOKUP_ID.ORDER_STATE.CONFIRMED,
      ] as string[]
    ).includes(orderStateLookupId); // pending, confirmed
  },
}));

export default function useOrderStore() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orderCache, orderDetailCache, ...actions } = useOrderStoreInternal();
  return actions;
}
