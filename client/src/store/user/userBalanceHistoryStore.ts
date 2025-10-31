import { create } from "zustand";
import type {
  UserBalanceHistoryListResponse,
  UserBalanceHistorySearchQuery,
} from "../../../../common/types.common";
import { formatError } from "../../../../common/utils.common";
import { retrieve } from "../../utils/utils";
import { SELF_BALANCE_HISTORY_URL } from "../../configs";

type UserBalanceHistory = {
  balanceHistories: UserBalanceHistoryListResponse | null;

  fetchBalanceHistories: (
    query?: UserBalanceHistorySearchQuery
  ) => Promise<UserBalanceHistoryListResponse>;
};

export const useUserBalanceHistoryStore = create<UserBalanceHistory>(() => ({
  balanceHistories: null,

  async fetchBalanceHistories(
    query?: UserBalanceHistorySearchQuery
  ): Promise<UserBalanceHistoryListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.category) queryString.set("category", query.category);
      if (query.createdAtFrom)
        queryString.set("createdAtFrom", query.createdAtFrom);
      if (query.createdAtTo) queryString.set("createdAtTo", query.createdAtTo);
    }

    try {
      const res = await retrieve(
        `${SELF_BALANCE_HISTORY_URL}?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data as UserBalanceHistoryListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
