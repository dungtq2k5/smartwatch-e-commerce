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

  getPermission: (permissionId: string) => PermissionResponse | undefined;

  fetchPermissions: () => Promise<PermissionListResponse>;
};

const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: null,

  getPermission(permissionId: string): PermissionResponse | undefined {
    return structuredClone(
      get().permissions?.permissions.find(
        (permission) => permission.id === permissionId,
      ),
    );
  },

  async fetchPermissions(): Promise<PermissionListResponse> {
    const { permissions } = get();
    if (permissions) return structuredClone(permissions);

    try {
      const res = await retrieve(PERMISSION_URL);
      if (!res.success) throw new Error(res.message);

      const permissions = res.data as PermissionListResponse;
      set({ permissions });

      return structuredClone(permissions);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default usePermissionStore;
