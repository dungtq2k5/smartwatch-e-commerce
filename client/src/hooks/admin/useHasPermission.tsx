import { useMemo } from "react";
import type { PermissionCode } from "../../../../common/types.common";
import useAuthStore from "../../store/admin/authStore";
import usePermissionStore from "../../store/admin/permissionStore";
import useRoleStore from "../../store/admin/roleStore";

/**
 * Custom hook to determine if the currently authenticated admin has a specific permission.
 *
 * It works by checking the roles assigned to the admin, and then iterating through the
 * permissions associated with each of those roles. If a permission with the matching
 * `permissionCode` is found, the hook returns `true`.
 *
 * @remarks
 * This hook depends on data from `useAuthStore`, `useRoleStore`, and `usePermissionStore`.
 * It is essential that the admin, roles, and permissions data are fetched and available
 * in these stores before this hook is used. If any of this data is missing, the hook
 * will return `false` and log a warning to the console.
 *
 * @param permissionCode The code of the permission to check for.
 * @returns `true` if the admin has the specified permission, otherwise `false`.
 *
 * @example
 * ```tsx
 * import { useHasPermission } from '@/hooks/admin/useHasPermission';
 * import { PermissionCode } from '@/types/PermissionCode'; // Assuming the enum is defined here
 *
 * const ProductManagementComponent = () => {
 *   const canDeleteProduct = useHasPermission(PermissionCode.PRODUCT_DELETE);
 *
 *   return (
 *     <div>
 *       <h1>Product Management</h1>
 *       {canDeleteProduct ? (
 *         <button>Delete Product</button>
 *       ) : (
 *         <p>You do not have permission to delete products.</p>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 */
export default function useHasPermission(
  permissionCode: PermissionCode,
): boolean {
  const { admin } = useAuthStore();
  const { allRolesLite: roles } = useRoleStore();
  const { permissions } = usePermissionStore();

  const hasPermission = useMemo((): boolean => {
    if (!admin || !roles || !permissions) {
      console.warn(
        "Admin, roles, or permissions data is missing. Please re-fetching them before use this hook.",
      );
      return false;
    }

    for (const adminRole of admin.roles) {
      const role = roles.roles.find((r) => r.id === adminRole.id);
      if (!role) continue;

      for (const rolePermission of role.permissions) {
        const permission = permissions.permissions.find(
          (p) => p.id === rolePermission.id,
        );
        if (permission?.code === permissionCode) {
          return true;
        }
      }
    }
    return false;
  }, [admin, roles, permissions, permissionCode]);

  return hasPermission;
}
