import { create } from "zustand";

type Scope = "admin";

type RefreshStore = {
  signals: Record<Scope, number>;
  refresh: (scope: Scope) => void;
};

export const useRefreshStore = create<RefreshStore>((set) => ({
  signals: { user: 0, admin: 0 },

  refresh: (scope: Scope) => {
    set((state) => ({
      signals: {
        ...state.signals,
        [scope]: state.signals[scope] + 1,
      },
    }));
  },
}));
