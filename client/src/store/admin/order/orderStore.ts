import { create } from "zustand";
import type {
  AdminOrderDetailsResponse,
  AdminOrderListResponse,
  AdminOrderResponse,
  AdminOrderSearchQuery,
  OrderUpdate,
  OrderUpdateBulk,
} from "../../../../../common/types.common";
import { patch, retrieve } from "../../../utils/utils";
import { ORDER_URL } from "../../../configs";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { MAX_ORDERS_TO_UPDATE_BULK } from "../../../../../common/configs.common";

type OrderState = {
  fetchOrders: (
    query?: AdminOrderSearchQuery,
  ) => Promise<AdminOrderListResponse>;
  fetchOrder: (orderId: string) => Promise<AdminOrderResponse>;
  fetchOrderDetail: (orderId: string) => Promise<AdminOrderDetailsResponse>;

  updateOrder: (
    orderId: string,
    data: OrderUpdate,
  ) => Promise<AdminOrderResponse>;
  updateOrderBulk: (data: OrderUpdateBulk) => Promise<void>;

  canEditOrder: (orderStateLookupId: string) => boolean;
};

export const useOrderStore = create<OrderState>(() => ({
  async fetchOrders(
    query?: AdminOrderSearchQuery,
  ): Promise<AdminOrderListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
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
      if (query.orderedBy) queryString.set("orderedBy", query.orderedBy);
    }

    try {
      const res = await retrieve(`${ORDER_URL}?${queryString.toString()}`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrder(orderId: string): Promise<AdminOrderResponse> {
    try {
      const res = await retrieve(`${ORDER_URL}/${orderId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrderDetail(id: string): Promise<AdminOrderDetailsResponse> {
    try {
      const res = await retrieve(`${ORDER_URL}/${id}/details`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderDetailsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateOrder(
    orderId: string,
    data: OrderUpdate,
  ): Promise<AdminOrderResponse> {
    try {
      const res = await patch(`${ORDER_URL}/${orderId}`, null, data);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateOrderBulk(data: OrderUpdateBulk): Promise<void> {
    try {
      if (data.orderIds.length === 0) {
        throw new Error("No orders selected for update.");
      }
      if (data.orderIds.length > MAX_ORDERS_TO_UPDATE_BULK) {
        throw new Error(
          `Cannot update more than ${MAX_ORDERS_TO_UPDATE_BULK} orders at once.`,
        );
      }

      const res = await patch(`${ORDER_URL}/many`, null, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  canEditOrder: (orderStateLookupId: string): boolean => {
    return orderStateLookupId !== "6"; // Can edit order which is not 'completed' or 'cancelled'
  },
}));
