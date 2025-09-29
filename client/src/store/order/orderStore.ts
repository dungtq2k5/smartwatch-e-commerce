import { create } from "zustand";
import type {
  OrderCreate,
  OrderDetailResponse,
  OrderListResponse,
  OrderResponse,
  OrderReturnResponse,
  OrderSearchQuery,
  OrderUpdateSelf,
} from "../../../../common/types.common";
import { patch, post, retrieve } from "../../utils/utils";
import { SELF_ORDER_URL, ORDER_URL } from "../../configs";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";

type OrderState = {
  orderCache: OrderResponse | null;
  orderDetailCache: OrderDetailResponse | null;

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
    data: OrderUpdateSelf
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

export const useOrderStore = create<OrderState>((set, get) => ({
  orderCache: null,
  orderDetailCache: null,

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
        `${ORDER_URL}?${queryString.toString()}`,
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
    if (orderCache && orderCache.id === id) return orderCache;

    try {
      // const res = await retrieve(`${ORDER_URL}/${id}`);
      // DEV temp for designing UI
      const res = {
        success: true,
        message: "Order retrieved successfully.",
        data: {
          id: "68bdb36eaaf574744ef355c2",
          userId: "68bdb36daaf574744ef355b3",
          items: [
            {
              variation: {
                id: "68bdb36caaf574744ef34cd0",
                name: "Bespoke Wooden Fish",
                color: {
                  hex: "#e9a862",
                  name: "white",
                },
                imageUrls: [
                  "https://picsum.photos/seed/smgBZA4x/600/696?grayscale&blur=9",
                  "https://picsum.photos/seed/ZSPawIQI/600/696?grayscale&blur=3",
                  "https://picsum.photos/seed/5gvHLm8qu/600/696?blur=9",
                  "https://picsum.photos/seed/xCzhdrJPqL/600/696?blur=3",
                  "https://picsum.photos/seed/MDjZVHIoq8/600/696?grayscale&blur=7",
                ],
                additionalPriceCents: 7960,
                stockQuantity: 1,
                stopSelling: false,
                isDeleted: false,
                productModel: {
                  id: "68bdb36caaf574744ef34ca8",
                  name: "Luxurious Wooden Bacon U14Ue",
                  priceCents: 89853,
                  stopSelling: false,
                  isDeleted: false,
                  product: {
                    id: "68bdb36caaf574744ef34c96",
                    name: "Tasty Rubber Chips Nkug6",
                    stopSelling: false,
                    isDeleted: false,
                  },
                },
              },
              quantity: 1,
              totalCents: 10563,
              instances: [
                {
                  id: "68bdb36caaf574744ef3501a",
                  sku: "461d8cdf-8292-45a6-a7b1-e2d408560e7f",
                  state: "ordered",
                },
              ],
            },
            {
              variation: {
                id: "68bdb36caaf574744ef34cd8",
                name: "Generic Metal Tuna",
                color: {
                  hex: "#ccb6b6",
                  name: "grey",
                },
                imageUrls: ["https://picsum.photos/seed/PJFzf/600/696?blur=3"],
                additionalPriceCents: 8778,
                stockQuantity: 37,
                stopSelling: false,
                isDeleted: false,
                productModel: {
                  id: "68bdb36caaf574744ef34cab",
                  name: "Intelligent Concrete Hat 5rRo6",
                  priceCents: 50445,
                  stopSelling: false,
                  isDeleted: false,
                  product: {
                    id: "68bdb36caaf574744ef34c97",
                    name: "Unbranded Steel Cheese 3tF5K",
                    stopSelling: false,
                    isDeleted: false,
                  },
                },
              },
              quantity: 2,
              totalCents: 21267,
              instances: [
                {
                  id: "68bdb36caaf574744ef350bc",
                  sku: "eae7283d-e2bb-4a0b-8530-7a9e3c2414d0",
                  state: "ordered",
                },
                {
                  id: "68bdb36caaf574744ef350c7",
                  sku: "87a4ea35-8fc0-467b-bf66-188904e9e1d0",
                  state: "ordered",
                },
              ],
            },
          ],
          deliveryAddress: {
            name: "Maurice Johns",
            street: "263 Barn Close",
            apartmentNumber: "63864",
            wardCode: "24109",
            districtCode: "637",
            cityProvinceCode: "64",
            countryCode: "84",
            location: {
              locationType: "point",
              coordinates: [-67.8466, 28.2734],
            },
            phoneNumber: "0940829986",
            fullAddress:
              "263 Barn Close, 63864, Xã Uar, Huyện Krông Pa, Tỉnh Gia Lai",
          },
          transaction: null,
          paymentSummary: {
            subtotalCents: 50547,
            appliedBalanceCents: 3000,
            finalAmountCents: 53547,
          },
          paymentMethodId: "68bdb176fae641fc999a1e97",
          deliveryStates: [
            {
              id: "68bdb176fae641fc999a1e8c",
              notes: "Order created, delivery pending.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:31:41.742Z",
            },
            {
              id: "68bdb176fae641fc999a1e8d",
              notes: "Order is being processed.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:33:41.742Z",
            },
            {
              id: "68bdb176fae641fc999a1e8e",
              notes: "Order has been shipped.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:34:41.742Z",
            },
            {
              id: "68bdb176fae641fc999a1e8f",
              notes: "Order is in transit.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:35:41.742Z",
            },
            {
              id: "68bdb176fae641fc999a1e90",
              notes: "Order is out for delivery.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:36:41.742Z",
            },
            {
              id: "68bdb176fae641fc999a1e91",
              notes: "Order has been delivered.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:37:41.742Z",
            },
          ],
          paymentStates: [
            {
              id: "68bdb176fae641fc999a1e9b",
              notes: "Order created, payment pending.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:31:41.742Z",
            },
            {
              id: "68bdb176fae641fc999a1e9c",
              notes: "Payment received via COD.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:32:41.742Z",
            },
          ],
          states: [
            {
              id: "68bdb177fae641fc999a1ea2",
              notes: "Order created, pending confirmation.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:31:41.742Z",
            },
            {
              id: "68bdb177fae641fc999a1ea3",
              notes: "Order confirmed.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:32:41.742Z",
            },
            {
              id: "68bdb177fae641fc999a1ea4",
              notes: "Order has been placed.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:33:41.742Z",
            },
            {
              id: "68bdb177fae641fc999a1ea5",
              notes: "Order is out for delivery.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:34:41.742Z",
            },
            {
              id: "68bdb177fae641fc999a1ea6",
              notes: "Order has been delivered.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:35:41.742Z",
            },
            {
              id: "68bdb177fae641fc999a1ea7",
              notes: "Order has been completed.",
              createdBy: "68bdb170fae641fc999a1e78",
              createdAt: "2025-09-07T16:36:41.742Z",
            },
          ],
          orderDate: "2025-09-07T16:31:41.742Z",
          estimateReceivedDate: "2025-09-14T16:31:41.742Z",
          receivedDate: "2025-09-07T16:37:41.742Z",
          fulfilledBy: "68bdb170fae641fc999a1e78",
          fulfilledAt: null,
          buyerCancelReasonId: null,
          createdAt: "2025-09-07T16:31:42.100Z",
          updatedAt: "2025-09-07T16:31:42.100Z",
        },
      };
      if (!res.success) throw new Error(res.message);

      const order = res.data as OrderResponse;
      set({ orderCache: order });
      return order;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchOrderDetail(id: string): Promise<OrderDetailResponse> {
    const { orderDetailCache } = get();
    if (orderDetailCache && orderDetailCache.id === id) return orderDetailCache;

    try {
      const res = await retrieve(`${ORDER_URL}/${id}/details`);
      if (!res.success) throw new Error(res.message);

      const orderDetail = res.data as OrderDetailResponse;
      set({ orderDetailCache: orderDetail });
      return orderDetail;
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
    data: OrderUpdateSelf
  ): Promise<OrderResponse> {
    try {
      const res = await patch(SELF_ORDER_URL, id, data);
      if (!res.success) throw new Error(res.message);

      const updatedOrder = res.data as OrderResponse;
      set({ orderCache: updatedOrder });
      return updatedOrder;
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
