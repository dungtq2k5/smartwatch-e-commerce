import { create } from "zustand";
import type {
  AdminOrderDetailsResponse,
  AdminOrderListResponse,
  AdminOrderResponse,
  AdminOrderSearchQuery,
  OrderFulfillItemUpdate,
  OrderResponse,
  OrderUpdate,
  OrderUpdateBulk,
  SortOption,
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
  fetchOrderDetails: (
    orderId: string,
    sortOptions?: Partial<{
      paymentStates: SortOption;
      deliveryStates: SortOption;
      orderStates: SortOption;
    }>,
  ) => Promise<AdminOrderDetailsResponse>;

  updateOrder: (
    orderId: string,
    data: OrderUpdate,
  ) => Promise<AdminOrderResponse>;
  updateOrderBulk: (data: OrderUpdateBulk) => Promise<void>;

  fulfillOrder: (data: OrderFulfillItemUpdate) => Promise<OrderResponse>;

  canUpdateOrder: (orderStateLookupId: string) => boolean;

  canFulfillOrder: (orderStateLookupId: string) => boolean;

  isCancelled: (orderStateLookupId: string) => boolean;
  isCompleted: (orderStateLookupId: string) => boolean;
};

export const useOrderStore = create<OrderState>((set, get) => ({
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

  async fetchOrderDetails(
    id: string,
    sortOptions?: Partial<{
      paymentStates: SortOption;
      deliveryStates: SortOption;
      orderStates: SortOption;
    }>,
  ): Promise<AdminOrderDetailsResponse> {
    try {
      const res = await retrieve(`${ORDER_URL}/${id}/details`);
      if (!res.success) throw new Error(res.message);

      const orderDetails = res.data as AdminOrderDetailsResponse;

      // Sort states by createdAt
      if (sortOptions?.orderStates) {
        orderDetails.states.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOptions.orderStates === "asc"
            ? dateA - dateB
            : dateB - dateA;
        });
      }

      // Sort payment states by createdAt
      if (sortOptions?.paymentStates) {
        orderDetails.paymentStates.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOptions.paymentStates === "asc"
            ? dateA - dateB
            : dateB - dateA;
        });
      }

      // Sort delivery states by createdAt
      if (sortOptions?.deliveryStates) {
        orderDetails.deliveryStates.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOptions.deliveryStates === "asc"
            ? dateA - dateB
            : dateB - dateA;
        });
      }

      return orderDetails;
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

  async fulfillOrder(data: OrderFulfillItemUpdate): Promise<OrderResponse> {
    try {
      const res = await patch(`${ORDER_URL}/fulfill-item`, null, data);
      if (!res.success) throw new Error(res.message);

      return res.data as OrderResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  canUpdateOrder: (orderStateLookupId: string): boolean => {
    return (
      !get().isCancelled(orderStateLookupId) &&
      !get().isCompleted(orderStateLookupId)
    );
  },

  canFulfillOrder: (orderStateLookupId: string): boolean => {
    return orderStateLookupId === "2"; // 'confirmed' state lookup ID
  },

  isCancelled: (orderStateLookupId: string): boolean => {
    return orderStateLookupId === "7"; // 'cancelled' state lookup ID
  },

  isCompleted: (orderStateLookupId: string): boolean => {
    return orderStateLookupId === "6"; // 'completed' state lookup ID
  },
}));
