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
import { MAX_ORDER_RETURNS_TO_UPDATE_BULK } from "../../../../../common/configs.common";

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
  updateReturnPickupStateBulk: (data: OrderReturnPickupStateUpdateBulk) => Promise<void>;

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
    try {
      const res = await retrieve(`${ORDER_RETURN_URL}/${returnId}/admin`);
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

  async updateReturnPickupStateBulk(data: OrderReturnPickupStateUpdateBulk): Promise<void> {
    try {
      if (data.returnIds.length === 0) {
        throw new Error("No returns selected for bulk pickup state update.");
      }
      if (data.returnIds.length > MAX_ORDER_RETURNS_TO_UPDATE_BULK) {
        throw new Error(
          `Cannot update pickup state for more than ${MAX_ORDER_RETURNS_TO_UPDATE_BULK} returns at once.`,
        );
      }

      const res = await patch(`${ORDER_RETURN_URL}/pickup-state/many`, null, data);
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
    return !["6", "7", "8"].includes(returnStateLookupId);
  },

  canUpdateReturnPickupState(returnStateLookupId: string): boolean {
    // Can update when return state is "approved", "items returning", and "items returned" states.
    return ["2", "3", "4"].includes(returnStateLookupId);
  },

  canApproveReturn(returnStateLookupId: string): boolean {
    // Can approve when return state is in "pending approval" state.
    return returnStateLookupId === "1";
  },

  canDeclineReturn(returnStateLookupId: string): boolean {
    // Can decline when return state is in "pending approval" state.
    return returnStateLookupId === "1";
  },

  canRefundReturn(returnStateLookupId: string): boolean {
    // Can refund when return state is in "items returned" state.
    return returnStateLookupId === "4";
  },
}));
