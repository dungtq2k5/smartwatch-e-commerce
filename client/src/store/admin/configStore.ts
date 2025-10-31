import { create } from "zustand";
import type { Config, UserManagementConfig } from "../../utils/types";
import { CONFIG_STORAGE_KEY, DEFAULT_ADMIN_CONFIG } from "../../configs";

type ConfigState = {
  config: Config;

  setUserManagementConfig: (config: UserManagementConfig) => void;
  resetUserManagementConfig: () => void;
};

const getInitialState = (): Config => {
  const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!storedConfig) return DEFAULT_ADMIN_CONFIG;
  return JSON.parse(storedConfig) as Config;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: getInitialState(),

  setUserManagementConfig: (config: UserManagementConfig): void => {
    const newConfig: Config = {
      ...get().config,
      userManagementConfig: config,
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },

  resetUserManagementConfig: (): void => {
    const newConfig: Config = {
      ...get().config,
      userManagementConfig: DEFAULT_ADMIN_CONFIG.userManagementConfig,
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    set({ config: newConfig });
  },
}));
