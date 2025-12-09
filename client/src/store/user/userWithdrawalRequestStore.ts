import { create } from "zustand";
import type {
  SelfWithdrawalRequestListResponse,
  SelfWithdrawalRequestResponse,
  SelfWithdrawalRequestSearchQuery,
  WithdrawalRequestCreate,
} from "../../../../common/types.common";
import { formatError } from "../../../../common/utils.common";
import { SELF_WITHDRAWAL_REQUESTS_URL } from "../../configs";
import { patch, post, retrieve } from "../../utils/utils";

type UserWithdrawalRequestState = {
  withdrawalRequestCache: SelfWithdrawalRequestResponse | null;

  fetchWithdrawalRequests: (
    query?: SelfWithdrawalRequestSearchQuery
  ) => Promise<SelfWithdrawalRequestListResponse>;
  fetchWithdrawalRequest: (
    requestId: string
  ) => Promise<SelfWithdrawalRequestResponse>;

  createWithdrawalRequest: (
    request: WithdrawalRequestCreate
  ) => Promise<SelfWithdrawalRequestResponse>;

  cancelWithdrawalRequest: (
    requestId: string
  ) => Promise<SelfWithdrawalRequestResponse>;

  canCancelRequest: (requestStateLookupId: string) => boolean;
};

const useUserWithdrawalRequestStoreInternal =
  create<UserWithdrawalRequestState>((set, get) => ({
    withdrawalRequestCache: null,

    async fetchWithdrawalRequests(
      query?: SelfWithdrawalRequestSearchQuery
    ): Promise<SelfWithdrawalRequestListResponse> {
      const queryString = new URLSearchParams();

      if (query) {
        if (query.limit) queryString.set("limit", query.limit);
        if (query.offset) queryString.set("offset", query.offset);
      }

      try {
        const res = await retrieve(
          `${SELF_WITHDRAWAL_REQUESTS_URL}?${queryString.toString()}`
        );
        if (!res.success) throw new Error(res.message);

        return res.data as SelfWithdrawalRequestListResponse;
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async fetchWithdrawalRequest(
      requestId: string
    ): Promise<SelfWithdrawalRequestResponse> {
      const { withdrawalRequestCache } = get();
      if (withdrawalRequestCache?.id === requestId) {
        return structuredClone(withdrawalRequestCache);
      }

      try {
        const res = await retrieve(
          `${SELF_WITHDRAWAL_REQUESTS_URL}/${requestId}`
        );
        if (!res.success) throw new Error(res.message);

        const withdrawalRequest = res.data as SelfWithdrawalRequestResponse;
        set({ withdrawalRequestCache: withdrawalRequest });
        return structuredClone(withdrawalRequest);
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async createWithdrawalRequest(
      request: WithdrawalRequestCreate
    ): Promise<SelfWithdrawalRequestResponse> {
      try {
        const res = await post(SELF_WITHDRAWAL_REQUESTS_URL, request);
        if (!res.success) throw new Error(res.message);

        const withdrawalRequest = res.data as SelfWithdrawalRequestResponse;
        set({ withdrawalRequestCache: withdrawalRequest });
        return structuredClone(withdrawalRequest);
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    async cancelWithdrawalRequest(
      requestId: string
    ): Promise<SelfWithdrawalRequestResponse> {
      try {
        const res = await patch(
          `${SELF_WITHDRAWAL_REQUESTS_URL}/${requestId}/cancel`
        );
        if (!res.success) throw new Error(res.message);

        const withdrawalRequest = res.data as SelfWithdrawalRequestResponse;
        set({ withdrawalRequestCache: withdrawalRequest });
        return structuredClone(withdrawalRequest);
      } catch (error) {
        throw new Error(formatError(error));
      }
    },

    canCancelRequest(requestStateLookupId: string): boolean {
      // Can only cancel if the latest state is "Pending" (lookupId: "1")
      return requestStateLookupId === "1";
    },
  }));

export default function useUserWithdrawalRequestStore() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { withdrawalRequestCache, ...actions } =
    useUserWithdrawalRequestStoreInternal();
  return actions;
}
