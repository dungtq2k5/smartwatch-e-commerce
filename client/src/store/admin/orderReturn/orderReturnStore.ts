import { create } from "zustand";
import type {
  AdminOrderReturnDetailsResponse,
  AdminOrderReturnListResponse,
  AdminOrderReturnResponse,
  AdminOrderReturnSearchQuery,
  OrderReturnPickupStateUpdate,
  OrderReturnPickupStateUpdateBulk,
  OrderReturnResponse,
  OrderReturnStateUpdate,
  OrderReturnStateUpdateBulk,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { ORDER_RETURN_URL } from "../../../configs";
import { patch, retrieve } from "../../../utils/utils";
import {
  MAX_ORDER_RETURNS_TO_UPDATE_BULK,
  LOOKUP_ID,
} from "../../../../../common/configs.common";

type ReturnState = {
  fetchReturns: (
    query?: AdminOrderReturnSearchQuery,
  ) => Promise<AdminOrderReturnListResponse>;
  fetchReturnDetails: (
    returnId: string,
  ) => Promise<AdminOrderReturnDetailsResponse>;

  updateReturnState: (
    returnId: string,
    data: OrderReturnStateUpdate,
  ) => Promise<OrderReturnResponse>;
  updateReturnStateBulk: (data: OrderReturnStateUpdateBulk) => Promise<void>;
  updateReturnPickupState: (
    returnId: string,
    data: OrderReturnPickupStateUpdate,
  ) => Promise<OrderReturnResponse>;
  updateReturnPickupStateBulk: (
    data: OrderReturnPickupStateUpdateBulk,
  ) => Promise<void>;

  getReturn: (returnId: string) => Promise<AdminOrderReturnResponse>;

  canUpdateReturnState: (returnStateLookupId: string) => boolean;
  canUpdateReturnPickupState: (pickupStateLookupId: string) => boolean;
  canApproveReturn: (returnStateLookupId: string) => boolean;
  canDeclineReturn: (returnStateLookupId: string) => boolean;
  canRefundReturn: (returnStateLookupId: string) => boolean;
};

export const useReturnStore = create<ReturnState>(() => ({
  async fetchReturns(
    query?: AdminOrderReturnSearchQuery,
  ): Promise<AdminOrderReturnListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
      if (query.finalRefundAmountCentsMin)
        queryString.set(
          "finalRefundAmountCentsMin",
          query.finalRefundAmountCentsMin,
        );
      if (query.finalRefundAmountCentsMax)
        queryString.set(
          "finalRefundAmountCentsMax",
          query.finalRefundAmountCentsMax,
        );
      if (query.refundStateIds?.length) {
        for (const refundStateId of query.refundStateIds) {
          queryString.append("refundStateId", refundStateId);
        }
      }
      if (query.pickupStateIds?.length) {
        for (const pickupStateId of query.pickupStateIds) {
          queryString.append("pickupStateId", pickupStateId);
        }
      }
      if (query.stateIds?.length) {
        for (const stateId of query.stateIds) {
          queryString.append("stateId", stateId);
        }
      }
      if (query.reasonIds?.length) {
        for (const reasonId of query.reasonIds) {
          queryString.append("reasonId", reasonId);
        }
      }
      if (query.pickupDateFrom)
        queryString.set("pickupDateFrom", query.pickupDateFrom);
      if (query.pickupDateTo)
        queryString.set("pickupDateTo", query.pickupDateTo);
      if (query.estimatePickupDateFrom)
        queryString.set("estimatePickupDateFrom", query.estimatePickupDateFrom);
      if (query.estimatePickupDateTo)
        queryString.set("estimatePickupDateTo", query.estimatePickupDateTo);
      if (query.createdAtFrom)
        queryString.set("createdAtFrom", query.createdAtFrom);
      if (query.createdAtTo) queryString.set("createdAtTo", query.createdAtTo);
      if (query.updatedAtFrom)
        queryString.set("updatedAtFrom", query.updatedAtFrom);
      if (query.updatedAtTo) queryString.set("updatedAtTo", query.updatedAtTo);
    }

    try {
      const res = await retrieve(
        `${ORDER_RETURN_URL}?${queryString.toString()}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderReturnListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchReturnDetails(
    returnId: string,
  ): Promise<AdminOrderReturnDetailsResponse> {
    // DEV temp for designing UI
    // return {
    //   id: "69627ba35ee956bed4239691",
    //   orderId: "69627ba35ee956bed4239686",
    //   items: [
    //     {
    //       variation: {
    //         id: "69627ba25ee956bed4238f69",
    //         name: "Licensed Gold Pizza",
    //         color: {
    //           hex: "#d3eee4",
    //           name: "lime",
    //         },
    //         imageUrls: [
    //           "https://picsum.photos/seed/VVPHBugVy/600/696?blur=2",
    //           "https://picsum.photos/seed/SrHg399g/600/696?blur=3",
    //           "https://picsum.photos/seed/TjrUZ/600/696?blur=10",
    //           "https://picsum.photos/seed/pYe5RU/600/696?blur=10",
    //         ],
    //         additionalPriceCents: 2262,
    //         stockQuantity: 18,
    //         stopSelling: false,
    //         isDeleted: false,
    //         productModel: {
    //           id: "69627ba25ee956bed4238f43",
    //           name: "Bespoke Marble Computer bZKfx",
    //           priceCents: 83343,
    //           stopSelling: false,
    //           isDeleted: false,
    //           product: {
    //             id: "69627ba25ee956bed4238f36",
    //             name: "Bespoke Granite Shirt j20az",
    //             stopSelling: false,
    //             isDeleted: false,
    //           },
    //         },
    //       },
    //       quantity: 1,
    //       totalCents: 11427,
    //       instances: [
    //         {
    //           id: "69627ba25ee956bed4239000",
    //           sku: "7500f147-acde-4955-aff8-afb6bbd6809b",
    //         },
    //       ],
    //     },
    //   ],
    //   pickupAddress: {
    //     name: "Brooke Zulauf III",
    //     street: "72018 Mosciski Valley",
    //     apartmentNumber: "529",
    //     wardCode: "13480",
    //     districtCode: "351",
    //     cityProvinceCode: "35",
    //     countryCode: "84",
    //     location: {
    //       locationType: "point",
    //       coordinates: [-73.0798, 87.4701],
    //     },
    //     phoneNumber: "0191758548",
    //     fullAddress:
    //       "72018 Mosciski Valley, 529, Xã Liêm Túc, Huyện Thanh Liêm, Tỉnh Hà Nam",
    //   },
    //   refundTransaction: {
    //     amountCents: 9900,
    //     currency: "USD",
    //     transactionDate: "2026-01-10T16:17:39.938Z",
    //     paymentIntentId: "pi_1J2Y2e2eZvKYlo2C0qL8u2X",
    //     createdAt: "2026-01-10T16:17:39.938Z",
    //   },
    //   refundSummary: {
    //     toCardCents: 9900,
    //     toBalanceCents: 0,
    //     finalRefundAmountCents: 9900,
    //   },
    //   pickupDate: null,
    //   estimatePickupDate: "2026-01-11T16:17:39.934Z",
    //   imageUrls: [
    //     "https://picsum.photos/seed/7ekAJVo3T/800/800?blur=7",
    //     "https://picsum.photos/seed/N5ufY4xd6/800/800?grayscale&blur=9",
    //     "https://picsum.photos/seed/4uP60/800/800?grayscale&blur=6",
    //   ],
    //   buyerReason: "The product is defective.",
    //   createdAt: "2026-01-10T16:17:39.939Z",
    //   updatedAt: "2026-01-10T16:17:39.939Z",
    //   reason: {
    //     id: "69627a9b21123eac35b594d1",
    //     name: "no reason",
    //     description: "No specific reason provided",
    //   },
    //   refundStates: [
    //     {
    //       id: "69627a9b21123eac35b594b8",
    //       lookupId: "1",
    //       name: "pending",
    //       notes: "Return requested nby mock function.",
    //       createdBy: "69627a9721123eac35b59477",
    //       createdAt: "2026-01-10T16:17:39.937Z",
    //     },
    //   ],
    //   pickupStates: [
    //     {
    //       id: "69627a9b21123eac35b594c8",
    //       lookupId: "1",
    //       name: "pending",
    //       level: 1,
    //       notes: "Return pickup requested by mock function.",
    //       createdBy: "69627a9721123eac35b59477",
    //       createdAt: "2026-01-10T16:17:39.937Z",
    //     },
    //   ],
    //   states: [
    //     {
    //       id: "69627a9b21123eac35b594be",
    //       lookupId: "1",
    //       name: "pending approval",
    //       level: 1,
    //       notes: "Return requested by mock function.",
    //       createdBy: "69627a9721123eac35b59477",
    //       createdAt: "2026-01-10T16:17:39.937Z",
    //     },
    //   ],
    //   returnedBy: {
    //     id: "69627ba35ee956bed423967c",
    //     fullName: "Trần Quang Dũng",
    //   },
    // };
    try {
      const res = await retrieve(
        `${ORDER_RETURN_URL}/${returnId}/details/admin`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderReturnDetailsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateReturnState(
    returnId: string,
    data: OrderReturnStateUpdate,
  ): Promise<OrderReturnResponse> {
    try {
      const res = await patch(
        `${ORDER_RETURN_URL}/${returnId}/state`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as OrderReturnResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateReturnStateBulk(data: OrderReturnStateUpdateBulk): Promise<void> {
    try {
      if (data.returnIds.length === 0) {
        throw new Error("No returns selected for bulk update.");
      }
      if (data.returnStateId.length > MAX_ORDER_RETURNS_TO_UPDATE_BULK) {
        throw new Error(
          `Cannot update more than ${MAX_ORDER_RETURNS_TO_UPDATE_BULK} returns at once.`,
        );
      }

      const res = await patch(`${ORDER_RETURN_URL}/state/many`, null, data);
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateReturnPickupState(
    returnId: string,
    data: OrderReturnPickupStateUpdate,
  ): Promise<OrderReturnResponse> {
    try {
      const res = await patch(
        `${ORDER_RETURN_URL}/${returnId}/pickup-state`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as OrderReturnResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateReturnPickupStateBulk(
    data: OrderReturnPickupStateUpdateBulk,
  ): Promise<void> {
    try {
      if (data.returnIds.length === 0) {
        throw new Error("No returns selected for bulk pickup state update.");
      }
      if (data.returnIds.length > MAX_ORDER_RETURNS_TO_UPDATE_BULK) {
        throw new Error(
          `Cannot update pickup state for more than ${MAX_ORDER_RETURNS_TO_UPDATE_BULK} returns at once.`,
        );
      }

      const res = await patch(
        `${ORDER_RETURN_URL}/pickup-state/many`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getReturn(returnId: string): Promise<AdminOrderReturnResponse> {
    try {
      const res = await retrieve(`${ORDER_RETURN_URL}/${returnId}/admin`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminOrderReturnResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  canUpdateReturnState(returnStateLookupId: string): boolean {
    // Can update when return state is not in "refunded", "canceled", and "declined" states.
    return !(
      [
        LOOKUP_ID.RETURN_STATE.REFUNDED,
        LOOKUP_ID.RETURN_STATE.CANCELLED,
        LOOKUP_ID.RETURN_STATE.DECLINED,
      ] as string[]
    ).includes(returnStateLookupId);
  },

  canUpdateReturnPickupState(returnStateLookupId: string): boolean {
    // Can update when return state is "approved", "items returning", and "items returned" states.
    return (
      [
        LOOKUP_ID.RETURN_STATE.APPROVED,
        LOOKUP_ID.RETURN_STATE.ITEMS_RETURNING,
        LOOKUP_ID.RETURN_STATE.ITEMS_RETURNED,
      ] as string[]
    ).includes(returnStateLookupId);
  },

  canApproveReturn(returnStateLookupId: string): boolean {
    // Can approve when return state is in "pending approval" state.
    return returnStateLookupId === LOOKUP_ID.RETURN_STATE.PENDING_APPROVAL;
  },

  canDeclineReturn(returnStateLookupId: string): boolean {
    // Can decline when return state is in "pending approval" state.
    return returnStateLookupId === LOOKUP_ID.RETURN_STATE.PENDING_APPROVAL;
  },

  canRefundReturn(returnStateLookupId: string): boolean {
    // Can refund when return state is in "items returned" state.
    return returnStateLookupId === LOOKUP_ID.RETURN_STATE.ITEMS_RETURNED;
  },
}));
