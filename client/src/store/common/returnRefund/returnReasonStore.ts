import { create } from "zustand";
import type {
  ReturnReasonListResponse,
  ReturnReasonResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { formatError } from "../../../../../common/utils.common";
import { RETURN_REASONS_URL } from "../../../configs";

type ReturnReasonState = {
  returnReasons: ReturnReasonListResponse | null;

  getReturnReason: (reasonId: string) => ReturnReasonResponse | undefined;

  fetchReturnReasons: () => Promise<ReturnReasonListResponse>;
};

const useReturnReasonStore = create<ReturnReasonState>((set, get) => ({
  returnReasons: null,

  getReturnReason: (reasonId: string) => {
    return structuredClone(
      get().returnReasons?.reasons.find((reason) => reason.id === reasonId),
    );
  },

  async fetchReturnReasons(): Promise<ReturnReasonListResponse> {
    const { returnReasons } = get();
    if (returnReasons) return structuredClone(returnReasons);

    try {
      const res = await retrieve(RETURN_REASONS_URL);
      if (!res.success) throw new Error(res.message);

      const returnReasons = res.data as ReturnReasonListResponse;
      set({ returnReasons });
      return structuredClone(returnReasons);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useReturnReasonStore;
