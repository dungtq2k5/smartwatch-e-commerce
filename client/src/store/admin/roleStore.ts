import { create } from "zustand";
import type {
  RoleListResponse,
  RoleResponse,
} from "../../../../common/types.common";
import { formatError } from "../../../../common/utils.common";
import { retrieve } from "../../utils/utils";
import { ROLE_URL } from "../../configs";

type RoleState = {
  roles: RoleListResponse | null;

  fetchRoles: () => Promise<RoleListResponse>;
  getRoleSync: (roleId: string) => RoleResponse | undefined;
};

export const useRoleStore = create<RoleState>((set, get) => ({
  roles: null,

  async fetchRoles(): Promise<RoleListResponse> {
    const { roles } = get();
    if (roles) return roles;

    try {
      const res = await retrieve(ROLE_URL);
      if (!res.success) throw new Error(res.message);

      const roles = res.data as RoleListResponse;
      set({ roles });
      return roles;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getRoleSync(roleId: string): RoleResponse | undefined {
    return get().roles?.roles.find((role) => role.id === roleId);
  },
}));
