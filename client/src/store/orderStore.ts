import { create } from "zustand";
import type {
  OrderCreate,
  OrderListResponse,
  OrderResponse,
  OrderSearchQuery,
} from "../../../common/types.common";
import { formatError, post, retrieve } from "../utils/utils";
import { ORDER_URL } from "../configs";
import { removeOddSpaces } from "../../../common/utils.common";

type UserOrderState = {
  createOrder: (order: OrderCreate) => Promise<OrderResponse>;
  fetchOrders: (query?: OrderSearchQuery) => Promise<OrderListResponse>;
};

export const useUserOrderStore = create<UserOrderState>(() => ({
  async createOrder(order: OrderCreate): Promise<OrderResponse> {
    try {
      const res = await post(ORDER_URL, order);
      if (!res.success) throw new Error(res.message);

      return res.data as OrderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrders(query?: OrderSearchQuery): Promise<OrderListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.deliveryStateId) {
        queryString.set("deliveryStateId", query.deliveryStateId);
      }
      if (query.paymentStatusId) {
        queryString.set("paymentStatusId", query.paymentStatusId);
      }
    }

    try {
      const res = await retrieve(`${ORDER_URL}?${queryString.toString()}`);
      if (!res.success) throw new Error(res.message);

      return res.data as OrderListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
