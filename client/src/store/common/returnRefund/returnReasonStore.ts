import { create } from "zustand";
import type { ReturnReasonListResponse } from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { ROOT_URL } from "../../../../../server/configs/configs";
import { formatError } from "../../../../../common/utils.common";

type ReturnReasonState = {
  returnReasons: ReturnReasonListResponse | null;

  fetchReturnReasons: () => Promise<ReturnReasonListResponse>;
};

export const useReturnReasonStore = create<ReturnReasonState>((set, get) => ({
  returnReasons: null,

  async fetchReturnReasons(): Promise<ReturnReasonListResponse> {
    const { returnReasons } = get();
    if (returnReasons) return returnReasons;

    try {
      const res = await retrieve(`${ROOT_URL}/return-reasons`);
      if (!res.success) throw new Error(res.message);

      const returnReasons = res.data as ReturnReasonListResponse;
      set({ returnReasons });
      return returnReasons;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
