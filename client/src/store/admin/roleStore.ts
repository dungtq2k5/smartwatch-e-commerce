import { create } from "zustand";
import type {
  RoleBulkDelete,
  RoleCreate,
  RoleDetailsResponse,
  RoleListResponse,
  RoleListResponseLight,
  RoleResponse,
  RoleResponseLight,
  RoleSearchQuery,
  RoleUpdate,
} from "../../../../common/types.common";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";
import { patch, post, remove, retrieve } from "../../utils/utils";
import { ROLE_URL } from "../../configs";
import { MAX_ROLES_TO_DELETE_BULK } from "../../../../common/configs.common";

type RoleState = {
  allRolesLite: RoleListResponseLight | null;

  removeCachedRoles: () => void;

  getRole: (roleId: string) => RoleResponseLight | undefined;
  fetchAllRoles: () => Promise<RoleListResponseLight>;
  fetchRoles: (query?: RoleSearchQuery) => Promise<RoleListResponse>;
  fetchRole: (roleId: string) => Promise<RoleResponse>;
  fetchRoleDetails: (roleId: string) => Promise<RoleDetailsResponse>;

  createRole: (roleData: RoleCreate) => Promise<RoleResponse>;

  updateRole: (roleId: string, roleData: RoleUpdate) => Promise<RoleResponse>;

  deleteRole: (roleId: string) => Promise<void>;
  deleteRoleBulk: (data: RoleBulkDelete) => Promise<void>;
};

const useRoleStore = create<RoleState>((set, get) => ({
  allRolesLite: null,

  removeCachedRoles(): void {
    set({ allRolesLite: null });
  },

  getRole(roleId: string): RoleResponseLight | undefined {
    return structuredClone(
      get().allRolesLite?.roles.find((role) => role.id === roleId),
    );
  },

  async fetchAllRoles(): Promise<RoleListResponseLight> {
    const { allRolesLite } = get();
    if (allRolesLite) return structuredClone(allRolesLite);

    try {
      const res = await retrieve(ROLE_URL + "/all");
      if (!res.success) throw new Error(res.message);

      const roles = res.data as RoleListResponseLight;
      set({ allRolesLite: roles });
      return structuredClone(roles);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchRoles(query?: RoleSearchQuery): Promise<RoleListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && !removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(`${ROLE_URL}?${queryString.toString()}`);
      if (!res.success) throw new Error(res.message);

      return res.data as RoleListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchRole(roleId: string): Promise<RoleResponse> {
    try {
      const res = await retrieve(`${ROLE_URL}/${roleId}`);
      if (!res.success) throw new Error(res.message);

      return res.data as RoleResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchRoleDetails(roleId: string): Promise<RoleDetailsResponse> {
    try {
      const res = await retrieve(`${ROLE_URL}/${roleId}/details`);
      if (!res.success) throw new Error(res.message);

      return res.data as RoleDetailsResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createRole(roleData: RoleCreate): Promise<RoleResponse> {
    try {
      const res = await post(ROLE_URL, roleData);
      if (!res.success) throw new Error(res.message);

      get().removeCachedRoles();
      return res.data as RoleResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateRole(
    roleId: string,
    roleData: RoleUpdate,
  ): Promise<RoleResponse> {
    try {
      const res = await patch(ROLE_URL, roleId, roleData);
      if (!res.success) throw new Error(res.message);

      get().removeCachedRoles();
      return res.data as RoleResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteRole(roleId: string): Promise<void> {
    try {
      const res = await remove(ROLE_URL, roleId);
      if (!res.success) throw new Error(res.message);

      const { allRolesLite } = get();
      if (allRolesLite) {
        const foundRoleIdx = allRolesLite.roles.findIndex(
          (role) => role.id === roleId,
        );
        if (foundRoleIdx !== -1) {
          allRolesLite.total -= 1;
          allRolesLite.roles.splice(foundRoleIdx, 1);
          set({ allRolesLite });
        }
      }
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async deleteRoleBulk(data: RoleBulkDelete): Promise<void> {
    try {
      if (data.roleIds.length === 0) {
        throw new Error("No roles provided for deletion.");
      }
      if (data.roleIds.length > MAX_ROLES_TO_DELETE_BULK) {
        throw new Error(
          `Cannot delete more than ${MAX_ROLES_TO_DELETE_BULK} roles at once.`,
        );
      }

      const res = await remove(`${ROLE_URL}/many`, null, data);
      if (!res.success) throw new Error(res.message);

      get().removeCachedRoles();
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useRoleStore;
