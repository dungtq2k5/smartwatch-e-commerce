import { create } from "zustand";
import type {
  RoleListResponseLight,
  RoleResponseLight,
} from "../../../../common/types.common";
import { formatError } from "../../../../common/utils.common";
import { retrieve } from "../../utils/utils";
import { ROLE_URL } from "../../configs";

type RoleState = {
  roles: RoleListResponseLight | null;

  getRole: (roleId: string) => RoleResponseLight | undefined;

  fetchRoles: () => Promise<RoleListResponseLight>;
};

const useRoleStore = create<RoleState>((set, get) => ({
  roles: null,

  getRole(roleId: string): RoleResponseLight | undefined {
    return structuredClone(
      get().roles?.roles.find((role) => role.id === roleId),
    );
  },

  async fetchRoles(): Promise<RoleListResponseLight> {
    const { roles } = get();
    if (roles) return structuredClone(roles);

    try {
      const res = await retrieve(ROLE_URL + "/all");
      if (!res.success) throw new Error(res.message);

      const roles = res.data as RoleListResponseLight;
      set({ roles });
      return structuredClone(roles);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useRoleStore;
