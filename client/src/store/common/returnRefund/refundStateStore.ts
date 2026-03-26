import { create } from "zustand";
import type {
  RefundStateListResponse,
  RefundStateResponse,
} from "../../../../../common/types.common";
import { REFUND_STATES_URL } from "../../../configs";
import { retrieve } from "../../../utils/utils";
import { formatError } from "../../../../../common/utils.common";

type RefundStateState = {
  refundStates: RefundStateListResponse | null;

  getRefundState: (id: string) => RefundStateResponse | undefined;
  getRefundStateByLookupId: (
    lookupId: string,
  ) => RefundStateResponse | undefined;

  fetchRefundStates: () => Promise<RefundStateListResponse>;
};

const useRefundStateStore = create<RefundStateState>((set, get) => ({
  refundStates: null,

  getRefundState(id: string): RefundStateResponse | undefined {
    return structuredClone(
      get().refundStates?.states.find((state) => state.id === id),
    );
  },

  getRefundStateByLookupId(lookupId): RefundStateResponse | undefined {
    return structuredClone(
      get().refundStates?.states.find((state) => state.lookupId === lookupId),
    );
  },

  async fetchRefundStates(): Promise<RefundStateListResponse> {
    const { refundStates } = get();
    if (refundStates) return structuredClone(refundStates);

    try {
      const res = await retrieve(REFUND_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const states = res.data as RefundStateListResponse;
      set({ refundStates: states });
      return structuredClone(states);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useRefundStateStore;
