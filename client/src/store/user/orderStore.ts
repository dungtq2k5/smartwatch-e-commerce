import { create } from "zustand";
import type {
  CheckoutSessionResponse,
  OrderCreate,
  OrderDetailResponse,
  OrderListResponse,
  OrderResponse,
  OrderReturnResponse,
  OrderSearchQuery,
  OrderSelfUpdate,
} from "../../../../common/types.common";
import { patch, post, retrieve } from "../../utils/utils";
import { SELF_ORDER_URL, ORDER_URL } from "../../configs";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";

type OrderState = {
  orderCache: OrderResponse | null;
  orderDetailCache: OrderDetailResponse | null;

  createCheckoutSession: (orderId: string) => Promise<CheckoutSessionResponse>;

  createOrder: (order: OrderCreate) => Promise<OrderResponse>;

  fetchOrders: (
    query?: OrderSearchQuery,
    signal?: AbortSignal
  ) => Promise<OrderListResponse>;
  fetchOrder: (id: string) => Promise<OrderResponse>;
  fetchOrderDetail: (id: string) => Promise<OrderDetailResponse>;

  checkItemIsReturned: (item: OrderResponse["items"][0]) => boolean;
  checkItemAvailable: (
    item: OrderResponse["items"][0] | OrderReturnResponse["items"][0]
  ) => boolean;
  updateSelfOrder: (
    id: string,
    data: OrderSelfUpdate
  ) => Promise<OrderResponse>;

  canSubmitOrder: (orderStateLookupId: string) => boolean;
  canReturnOrder: (
    order: OrderResponse | OrderDetailResponse,
    orderStateLookupId: string
  ) => boolean;
  canCancelOrder: (orderStateLookupId: string) => boolean;
  canBuyAgainOrder: (
    order: OrderResponse | OrderDetailResponse,
    orderStateLookupId: string
  ) => boolean;
  canPay: (
    orderStateLookupId: string,
    paymentMethodLookupId: string
  ) => boolean;
  canChangeDeliveryAddress: (orderStateLookupId: string) => boolean;
};

const useOrderStoreInternal = create<OrderState>((set, get) => ({
  orderCache: null,
  orderDetailCache: null,

  async createCheckoutSession(
    orderId: string
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
    signal?: AbortSignal
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
        signal
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
      const res = await retrieve(`${ORDER_URL}/${id}`);
      if (!res.success) throw new Error(res.message);

      const order = res.data as OrderResponse;
      set({ orderCache: order });
      return structuredClone(order);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrderDetail(id: string): Promise<OrderDetailResponse> {
    const { orderDetailCache } = get();
    if (orderDetailCache?.id === id) return structuredClone(orderDetailCache);

    try {
      const res = await retrieve(`${ORDER_URL}/${id}/details`);
      if (!res.success) throw new Error(res.message);

      const orderDetail = res.data as OrderDetailResponse;
      set({ orderDetailCache: orderDetail });
      return structuredClone(orderDetail);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  checkItemIsReturned(item: OrderResponse["items"][0]): boolean {
    return item.instances.some((i) =>
      ["return pending", "returned"].includes(i.state)
    );
  },

  checkItemAvailable(
    item: OrderResponse["items"][0] | OrderReturnResponse["items"][0]
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
    data: OrderSelfUpdate
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
    return orderStateLookupId === "5"; // delivered
  },

  canReturnOrder(
    order: OrderResponse | OrderDetailResponse,
    orderStateLookupId: string
  ): boolean {
    return (
      order.canReturn &&
      ["5", "6"].includes(orderStateLookupId || "") && // delivered, completed
      order.items.some((item) =>
        item.instances.some((inst) => inst.state === "ordered")
      ) // At least one item is in "ordered" state -> can return
    );
  },

  canCancelOrder(orderStateLookupId: string): boolean {
    return ["1", "2"].includes(orderStateLookupId); // pending, confirmed
  },

  canBuyAgainOrder(
    order: OrderResponse | OrderDetailResponse,
    orderStateLookupId: string
  ): boolean {
    const availableItems = order.items.filter(get().checkItemAvailable);
    return (
      orderStateLookupId === "6" && // completed
      availableItems.length > 0 // At least one item is available
    );
  },

  canPay(orderStateLookupId: string, paymentMethodLookupId: string): boolean {
    return (
      orderStateLookupId === "1" && // pending
      paymentMethodLookupId === "2" // stripe
    );
  },

  canChangeDeliveryAddress(orderStateLookupId: string): boolean {
    return ["1", "2"].includes(orderStateLookupId); // pending, confirmed
  },
}));

export default function useOrderStore() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { orderCache, orderDetailCache, ...actions } = useOrderStoreInternal();
  return actions;
}
