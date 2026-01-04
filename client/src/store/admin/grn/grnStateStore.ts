import { create } from "zustand";
import type { GrnStateListResponse } from "../../../../../common/types.common";
import { formatError } from "../../../../../common/utils.common";
import { retrieve } from "../../../utils/utils";
import { GRN_STATES_URL } from "../../../configs";

type GrnStateState = {
  grnStates: GrnStateListResponse | null;

  fetchGrnStates: () => Promise<GrnStateListResponse>;
};

const useGrnStateStore = create<GrnStateState>((set, get) => ({
  grnStates: null,

  async fetchGrnStates(): Promise<GrnStateListResponse> {
    const { grnStates } = get();
    if (grnStates) return structuredClone(grnStates);

    try {
      const res = await retrieve(GRN_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const states = res.data as GrnStateListResponse;
      set({ grnStates: states });
      return structuredClone(states);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useGrnStateStore;
