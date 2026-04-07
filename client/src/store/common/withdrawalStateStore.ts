import { create } from "zustand";
import type {
  WithdrawalStateListResponse,
  WithdrawalStateResponse,
} from "../../../../common/types.common";
import { retrieve } from "../../utils/utils";
import { WITHDRAWAL_STATES_URL } from "../../configs";
import { formatError } from "../../../../common/utils.common";

type WithdrawalRequestState = {
  withdrawalStates: WithdrawalStateListResponse | null;

  getWithdrawalStates: () => WithdrawalStateListResponse | null;
  getWithdrawalState: (id: string) => WithdrawalStateResponse | undefined;
  getWithdrawalStateByLookupId: (
    lookupId: string,
  ) => WithdrawalStateResponse | undefined;

  fetchWithdrawalStates: () => Promise<WithdrawalStateListResponse>;
  fetchWithdrawalState: (id: string) => Promise<WithdrawalStateResponse>;
};

const useWithdrawalStateStore = create<WithdrawalRequestState>((set, get) => ({
  withdrawalStates: null,

  getWithdrawalStates(): WithdrawalStateListResponse | null {
    return structuredClone(get().withdrawalStates);
  },

  getWithdrawalState(id: string): WithdrawalStateResponse | undefined {
    return structuredClone(
      get().withdrawalStates?.states.find((state) => state.id === id),
    );
  },

  getWithdrawalStateByLookupId(
    lookupId: string,
  ): WithdrawalStateResponse | undefined {
    return structuredClone(
      get().withdrawalStates?.states.find(
        (state) => state.lookupId === lookupId,
      ),
    );
  },

  async fetchWithdrawalStates(): Promise<WithdrawalStateListResponse> {
    const { withdrawalStates } = get();
    if (withdrawalStates) return structuredClone(withdrawalStates);

    try {
      const res = await retrieve(WITHDRAWAL_STATES_URL);
      if (!res.success) throw new Error(res.message);

      const states = res.data as WithdrawalStateListResponse;
      set({ withdrawalStates: states });
      return structuredClone(states);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchWithdrawalState(id: string): Promise<WithdrawalStateResponse> {
    const state = get().withdrawalStates?.states.find(
      (state) => state.id === id,
    );
    if (state) return structuredClone(state);

    try {
      const fetchedStates = await get().fetchWithdrawalStates();
      const state = fetchedStates.states.find((state) => state.id === id);
      if (!state) {
        throw new Error(`Withdrawal state with id ${id} not found`);
      }
      return state;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useWithdrawalStateStore;
