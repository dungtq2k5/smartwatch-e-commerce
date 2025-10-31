import { create } from "zustand";
import type {
  PermissionListResponse,
  PermissionResponse,
} from "../../../../common/types.common";
import { retrieve } from "../../utils/utils";
import { PERMISSION_URL } from "../../configs";
import { formatError } from "../../../../common/utils.common";

type PermissionState = {
  permissions: PermissionListResponse | null;

  fetchPermissions: () => Promise<PermissionListResponse>;
  getPermissionSync: (permissionId: string) => PermissionResponse | undefined;
};

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: null,

  async fetchPermissions(): Promise<PermissionListResponse> {
    const { permissions } = get();
    if (permissions) return permissions;

    try {
      const res = await retrieve(PERMISSION_URL);
      if (!res.success) throw new Error(res.message);

      const permissions = res.data as PermissionListResponse;
      set({ permissions });
      return permissions;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getPermissionSync(permissionId: string): PermissionResponse | undefined {
    return get().permissions?.permissions.find(
      (permission) => permission.id === permissionId
    );
  },
}));
