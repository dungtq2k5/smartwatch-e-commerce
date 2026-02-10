import { create } from "zustand";
import type { ProviderCreationWizardStep } from "../../../utils/types";

type WizardStep = ProviderCreationWizardStep | null;

type ProviderWizardState = {
  isActive: boolean;
  startStep: "provider" | null;
  currStep: WizardStep;

  context: {
    providerId: string | null;
    providerName: string | null;
    addressId: string | null;
  };

  startFlow: (startStep: "provider") => void;
  setContext: (ctx: Partial<ProviderWizardState["context"]>) => void;
  nextStep: (next: ProviderCreationWizardStep) => void;
  reset: () => void;
};

const useProviderWizardStore = create<ProviderWizardState>((set) => ({
  isActive: false,
  startStep: null,
  currStep: null,
  context: {
    providerId: null,
    providerName: null,
    addressId: null,
  },

  startFlow(startStep) {
    set({
      isActive: true,
      currStep: startStep,
    });
  },

  setContext(ctx) {
    set((state) => ({
      context: {
        ...state.context,
        ...ctx,
      },
    }));
  },

  nextStep(next) {
    set({
      currStep: next,
    });
  },

  reset() {
    set({
      isActive: false,
      startStep: null,
      currStep: null,
      context: {
        providerId: null,
        providerName: null,
        addressId: null,
      },
    });
  },
}));

export default useProviderWizardStore;
