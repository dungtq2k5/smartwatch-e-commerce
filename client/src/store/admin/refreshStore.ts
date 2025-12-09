import { create } from "zustand";

type Scope = "admin";

type RefreshStore = {
  signals: Record<Scope, number>;

  refresh: (scope: Scope) => void;
};

const useRefreshStore = create<RefreshStore>((set) => ({
  signals: { admin: 0 },

  refresh: (scope: Scope) => {
    set((state) => ({
      signals: {
        ...state.signals,
        [scope]: state.signals[scope] + 1,
      },
    }));
  },
}));

export default useRefreshStore;
