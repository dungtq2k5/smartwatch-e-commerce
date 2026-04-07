import { create } from "zustand";
import type {
  AdminWithdrawalRequestListResponse,
  AdminWithdrawalRequestResponse,
  ApproveWithdrawalRequest,
  ApproveWithdrawalRequestBulk,
  RejectWithdrawalRequest,
  SelfWithdrawalRequestResponse,
  WithdrawalRequestSearchQuery,
} from "../../../../common/types.common";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";
import { WITHDRAWAL_REQUESTS_URL } from "../../configs";
import { patch, retrieve } from "../../utils/utils";
import {
  LOOKUP_ID,
  MAX_WITHDRAWAL_REQUESTS_TO_UPDATE_BULK,
} from "../../../../common/configs.common";

type WithdrawalRequestState = {
  fetchWithdrawalRequests: (
    query?: WithdrawalRequestSearchQuery,
  ) => Promise<AdminWithdrawalRequestListResponse>;
  fetchWithdrawalRequest: (
    requestId: string,
  ) => Promise<AdminWithdrawalRequestResponse>;

  approveWithdrawalRequest: (
    requestId: string,
    data: ApproveWithdrawalRequest,
  ) => Promise<SelfWithdrawalRequestResponse>;
  approveWithdrawalRequestBulk: (
    data: ApproveWithdrawalRequestBulk,
  ) => Promise<void>;
  rejectWithdrawalRequest: (
    requestId: string,
    data: RejectWithdrawalRequest,
  ) => Promise<SelfWithdrawalRequestResponse>;
  rejectWithdrawalRequestBulk: (
    data: ApproveWithdrawalRequestBulk,
  ) => Promise<void>;

  canApproveRequest: (requestStateLookupId: string) => boolean;
  canRejectRequest: (requestStateLookupId: string) => boolean;
};

const useWithdrawalRequestStore = create<WithdrawalRequestState>(() => ({
  async fetchWithdrawalRequests(
    query?: WithdrawalRequestSearchQuery,
  ): Promise<AdminWithdrawalRequestListResponse> {
    // DEV Temp for testing UI
    // return {
    //   total: 1,
    //   offset: 0,
    //   limit: 9,
    //   requests: {
    //     total: 1,
    //     requests: [
    //       {
    //         id: "req_123",
    //         requestedBy: {
    //           id: "user_123",
    //           fullName: "John Doe",
    //         },
    //         amountCents: 5000,
    //         currency: "USD",
    //         states: [
    //           {
    //             id: "state_123",
    //             notes: "Initial state",
    //             createdBy: "system",
    //             createdAt: "2024-01-01T00:00:00Z",
    //           },
    //           {
    //             id: "state_124",
    //             notes: "Approved by admin",
    //             createdBy: "admin_456",
    //             createdAt: "2024-01-02T00:00:00Z",
    //           },
    //           {
    //             id: "state_125",
    //             notes: "Processed by system",
    //             createdBy: "system",
    //             createdAt: "2024-01-03T00:00:00Z",
    //           },
    //         ],
    //         withdrawalMethod: "bank_transfer",
    //         stripeTransferGroupId: "group_123",
    //         stripeTransferId: "transfer_123",
    //         bankAccount: {
    //           stripeConnectedAccountId: "acct_123",
    //           accountHolderName: "John Doe",
    //           last4: "4242",
    //           bankName: "Bank of Test",
    //         },
    //         failureReason: null,
    //         processedAt: "2024-01-03T00:00:00Z",
    //         createdAt: "2024-01-01T00:00:00Z",
    //         updatedAt: "2024-01-03T00:00:00Z",
    //       },
    //     ],
    //   },
    // };

    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
      if (query.stateIds?.length) {
        for (const stateId of query.stateIds) {
          queryString.append("stateId", stateId);
        }
      }
      if (query.amountCentsMin)
        queryString.set("amountCentsMin", query.amountCentsMin);
      if (query.amountCentsMax)
        queryString.set("amountCentsMax", query.amountCentsMax);
      if (query.currency && removeOddSpaces(query.currency))
        queryString.set("currency", query.currency);
      if (query.withdrawalMethod)
        queryString.set("withdrawalMethod", query.withdrawalMethod);
      if (query.createdAtFrom)
        queryString.set("createdAtFrom", query.createdAtFrom);
      if (query.createdAtTo) queryString.set("createdAtTo", query.createdAtTo);
    }

    try {
      const res = await retrieve(
        `${WITHDRAWAL_REQUESTS_URL}?${queryString.toString()}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as AdminWithdrawalRequestListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchWithdrawalRequest(
    requestId: string,
  ): Promise<AdminWithdrawalRequestResponse> {
    // DEV Temp for testing UI
    // return {
    //   id: "req_123",
    //   requestedBy: {
    //     id: "user_123",
    //     fullName: "John Doe",
    //   },
    //   amountCents: 5000,
    //   currency: "USD",
    //   states: [
    //     {
    //       id: "state_123",
    //       notes: "Initial state",
    //       createdBy: "system",
    //       createdAt: "2024-01-01T00:00:00Z",
    //     },
    //     {
    //       id: "state_124",
    //       notes: "Approved by admin",
    //       createdBy: "admin_456",
    //       createdAt: "2024-01-02T00:00:00Z",
    //     },
    //     {
    //       id: "state_125",
    //       notes: "Processed by system",
    //       createdBy: "system",
    //       createdAt: "2024-01-03T00:00:00Z",
    //     },
    //   ],
    //   withdrawalMethod: "bank_transfer",
    //   stripeTransferGroupId: "group_123",
    //   stripeTransferId: "transfer_123",
    //   bankAccount: {
    //     stripeConnectedAccountId: "acct_123",
    //     accountHolderName: "John Doe",
    //     last4: "4242",
    //     bankName: "Bank of Test",
    //   },
    //   failureReason: null,
    //   processedAt: "2024-01-03T00:00:00Z",
    //   createdAt: "2024-01-01T00:00:00Z",
    //   updatedAt: "2024-01-03T00:00:00Z",
    // };

    try {
      const res = await retrieve(`${WITHDRAWAL_REQUESTS_URL}/${requestId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as AdminWithdrawalRequestResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async approveWithdrawalRequest(
    requestId: string,
    data: ApproveWithdrawalRequest,
  ): Promise<SelfWithdrawalRequestResponse> {
    try {
      const res = await patch(
        `${WITHDRAWAL_REQUESTS_URL}/${requestId}/approve`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as SelfWithdrawalRequestResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async approveWithdrawalRequestBulk(
    data: ApproveWithdrawalRequestBulk,
  ): Promise<void> {
    try {
      if (data.requestIds.length === 0) {
        throw new Error("No request IDs provided for bulk approval.");
      }
      if (data.requestIds.length > MAX_WITHDRAWAL_REQUESTS_TO_UPDATE_BULK) {
        throw new Error(
          `Cannot approve more than ${MAX_WITHDRAWAL_REQUESTS_TO_UPDATE_BULK} withdrawal requests at once.`,
        );
      }

      const res = await patch(
        `${WITHDRAWAL_REQUESTS_URL}/approve/many`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async rejectWithdrawalRequest(
    requestId: string,
    data: RejectWithdrawalRequest,
  ): Promise<SelfWithdrawalRequestResponse> {
    try {
      const res = await patch(
        `${WITHDRAWAL_REQUESTS_URL}/${requestId}/reject`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as SelfWithdrawalRequestResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async rejectWithdrawalRequestBulk(
    data: ApproveWithdrawalRequestBulk,
  ): Promise<void> {
    try {
      if (data.requestIds.length === 0) {
        throw new Error("No request IDs provided for bulk rejection.");
      }
      if (data.requestIds.length > MAX_WITHDRAWAL_REQUESTS_TO_UPDATE_BULK) {
        throw new Error(
          `Cannot reject more than ${MAX_WITHDRAWAL_REQUESTS_TO_UPDATE_BULK} withdrawal requests at once.`,
        );
      }

      const res = await patch(
        `${WITHDRAWAL_REQUESTS_URL}/reject/many`,
        null,
        data,
      );
      if (!res.success) throw new Error(res.message);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  canApproveRequest(requestStateLookupId: string): boolean {
    return requestStateLookupId === LOOKUP_ID.WITHDRAWAL_STATE.PENDING;
  },

  canRejectRequest(requestStateLookupId: string): boolean {
    return requestStateLookupId === LOOKUP_ID.WITHDRAWAL_STATE.PENDING;
  },
}));

export default useWithdrawalRequestStore;
