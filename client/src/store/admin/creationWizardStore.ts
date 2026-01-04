import { create } from "zustand";
import type { ProductCreationWizardStep } from "../../utils/types";

type WizardStep = ProductCreationWizardStep | null;

type CreationWizardState = {
  isActive: boolean;
  startStep: WizardStep;
  currStep: WizardStep;

  // Track IDs created during the session so we don't lose context
  context: {
    productId: string | null;
    productName: string | null;
    modelId: string | null;
    modelName: string | null;
    variationId: string | null;
    variationName: string | null;
  };

  // Actions
  startFlow: (startStep?: WizardStep) => void;
  setContext: (ctx: Partial<CreationWizardState["context"]>) => void;
  nextStep: (next: WizardStep) => void;
  reset: () => void;
};

const useCreationWizardStore = create<CreationWizardState>((set) => ({
  isActive: false,
  startStep: null,
  currStep: null,
  context: {
    productId: null,
    productName: null,
    modelId: null,
    modelName: null,
    variationId: null,
    variationName: null,
  },

  startFlow(step = "product") {
    set({
      isActive: true,
      startStep: step,
      currStep: step,
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
        productId: null,
        productName: null,
        modelId: null,
        modelName: null,
        variationId: null,
        variationName: null,
      },
    });
  },
}));

export default useCreationWizardStore;
