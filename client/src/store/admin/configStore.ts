import { create } from "zustand";
import type {
  AdminConfig,
  GrnDisplayField,
  ModelVariationDisplayField,
  OrderDisplayField,
  ProductBrandDisplayField,
  ProductCategoryDisplayField,
  ProductDisplayField,
  ProductModelDisplayField,
  ProductOsDisplayField,
  ProviderDisplayField,
  RoleDisplayField,
  UserDisplayField,
  VariationInstanceDisplayField,
} from "../../utils/types";
import { CONFIG_STORAGE_KEY, DEFAULT_ADMIN_CONFIG } from "../../configs";

type ConfigState = {
  config: AdminConfig;

  setUserManagementDisplayFields: (displayFields: UserDisplayField[]) => void;
  resetUserManagementDisplayFields: () => void;

  setProductManagementDisplayFields: (
    displayFields: ProductDisplayField[],
  ) => void;
  resetProductManagementDisplayFields: () => void;

  setProductModelManagementDisplayFields: (
    displayFields: ProductModelDisplayField[],
  ) => void;
  resetProductModelManagementDisplayFields: () => void;

  setModelVariationManagementDisplayFields: (
    displayFields: ModelVariationDisplayField[],
  ) => void;
  resetModelVariationManagementDisplayFields: () => void;

  setVariationInstanceManagementDisplayFields: (
    displayFields: VariationInstanceDisplayField[],
  ) => void;
  resetVariationInstanceManagementDisplayFields: () => void;

  setGrnManagementDisplayFields: (displayFields: GrnDisplayField[]) => void;
  resetGrnManagementDisplayFields: () => void;

  setProductBrandManagementDisplayFields: (
    displayFields: ProductBrandDisplayField[],
  ) => void;
  resetProductBrandManagementDisplayFields: () => void;

  setProductCategoryManagementDisplayFields: (
    displayFields: ProductCategoryDisplayField[],
  ) => void;
  resetProductCategoryManagementDisplayFields: () => void;

  setProductOsManagementDisplayFields: (
    displayFields: ProductOsDisplayField[],
  ) => void;
  resetProductOsManagementDisplayFields: () => void;

  setProviderManagementDisplayFields: (
    displayFields: ProviderDisplayField[],
  ) => void;
  resetProviderManagementDisplayFields: () => void;

  setRoleManagementDisplayFields: (displayFields: RoleDisplayField[]) => void;
  resetRoleManagementDisplayFields: () => void;

  setOrderManagementDisplayFields: (displayFields: OrderDisplayField[]) => void;
  resetOrderManagementDisplayFields: () => void;
};

const getInitialState = (): AdminConfig => {
  const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!storedConfig) return structuredClone(DEFAULT_ADMIN_CONFIG);

  try {
    const parsedConfig = JSON.parse(storedConfig) as Partial<AdminConfig>;
    return structuredClone({ ...DEFAULT_ADMIN_CONFIG, ...parsedConfig });
  } catch (error) {
    console.error("Failed to parse config from localStorage:", error);
    return structuredClone(DEFAULT_ADMIN_CONFIG);
  }
};

const useConfigStore = create<ConfigState>((set, get) => ({
  config: getInitialState(),

  setUserManagementDisplayFields: (displayFields: UserDisplayField[]): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      userManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetUserManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      userManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.userManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setProductManagementDisplayFields: (
    displayFields: ProductDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetProductManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.productManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setProductModelManagementDisplayFields: (
    displayFields: ProductModelDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productModelManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetProductModelManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productModelManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.productModelManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setModelVariationManagementDisplayFields: (
    displayFields: ModelVariationDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      modelVariationManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetModelVariationManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      modelVariationManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.modelVariationManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setVariationInstanceManagementDisplayFields: (
    displayFields: VariationInstanceDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      variationInstanceManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetVariationInstanceManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      variationInstanceManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.variationInstanceManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setGrnManagementDisplayFields: (displayFields: GrnDisplayField[]): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      grnManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetGrnManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      grnManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.grnManagementDisplayFields,
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setProductBrandManagementDisplayFields: (
    displayFields: ProductBrandDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productBrandManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetProductBrandManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productBrandManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.productBrandManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setProductCategoryManagementDisplayFields: (
    displayFields: ProductCategoryDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productCategoryManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetProductCategoryManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productCategoryManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.productCategoryManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setProductOsManagementDisplayFields: (
    displayFields: ProductOsDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productOsManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetProductOsManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      productOsManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.productOsManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setProviderManagementDisplayFields: (
    displayFields: ProviderDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      providerManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetProviderManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      providerManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.providerManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setRoleManagementDisplayFields: (displayFields: RoleDisplayField[]): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      roleManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetRoleManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      roleManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.roleManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  setOrderManagementDisplayFields: (
    displayFields: OrderDisplayField[],
  ): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      orderManagementDisplayFields: displayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetOrderManagementDisplayFields: (): void => {
    const newConfig: AdminConfig = {
      ...get().config,
      orderManagementDisplayFields:
        DEFAULT_ADMIN_CONFIG.orderManagementDisplayFields,
    };

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },
}));

export default useConfigStore;
