import { create } from "zustand";
import type {
  AdminConfig,
  ProductDisplayField,
  ProductModelDisplayField,
  UserDisplayField,
} from "../../utils/types";
import { CONFIG_STORAGE_KEY, DEFAULT_ADMIN_CONFIG } from "../../configs";

type ConfigState = {
  config: AdminConfig;

  setUserManagementDisplayFields: (displayFields: UserDisplayField[]) => void;
  resetUserManagementDisplayFields: () => void;

  setProductManagementDisplayFields: (
    displayFields: ProductDisplayField[]
  ) => void;
  resetProductManagementDisplayFields: () => void;

  setProductModelManagementDisplayFields: (
    displayFields: ProductModelDisplayField[]
  ) => void;
  resetProductModelManagementDisplayFields: () => void;
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
    displayFields: ProductDisplayField[]
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
    displayFields: ProductModelDisplayField[]
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
}));

export default useConfigStore;
