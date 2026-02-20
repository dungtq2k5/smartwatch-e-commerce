import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import useRoleStore from "../../../store/admin/roleStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import usePermissionStore from "../../../store/admin/permissionStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import type {
  RoleResponse,
  RoleUpdate,
} from "../../../../../common/types.common";
import type { PermissionMatrix, FormInput } from "../../../utils/types";
import {
  capFirstLetter,
  compareList,
  formatError,
  isValidGeneralName,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import {
  DISABLED_TITLE_FOR_VIEWING,
  PERMISSION_OPERATIONS,
  WAITING_EMOJI,
} from "../../../configs";
import Title from "../Title";
import Label from "../../common/Label";
import Input from "../../common/Input";
import ApiError from "../../common/ApiError";
import Btn from "../../common/Btn";
import DetailUserLink from "../DetailUserLink";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import {
  getGroupedPermissions,
  getPermissionsMatrix,
} from "../../../utils/utils";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

export type FormData = {
  name: FormInput;
  permissions: FormInput<string[] | "all", undefined>;
};

export default function EditRole() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("EditRole rendered", renderCount.current);

  const { id } = useParams();
  const navigate = useNavigate();

  const { fetchRole, updateRole } = useRoleStore();
  const { permissions, fetchPermissions } = usePermissionStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditRole, canReadUser] = [
    useHasPermission("u_usr_role"),
    useHasPermission("r_usr"),
  ];

  const [role, setRole] = useState<RoleResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    permissions: { val: [] },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const permissionsMatrix = useMemo((): PermissionMatrix[] | null => {
    if (!permissions) return null;

    const grouped = getGroupedPermissions(permissions.permissions);
    return getPermissionsMatrix(grouped);
  }, [permissions]);

  // Fetch and set initial data when first load or refresh signal: role, permissions
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("Role ID is missing.");

        const [fetchedRole] = await Promise.all([
          fetchRole(id),
          permissions ? Promise.resolve() : fetchPermissions(),
        ]);

        setRole(fetchedRole);

        const copiedRole = structuredClone(fetchedRole);
        setFormData({
          name: { val: copiedRole.name },
          permissions: { val: copiedRole.permissions.map((p) => p.id) },
        });
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isInitializing: false,
        }));
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshSignal]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !permissions) return;

      const { name, value: val, checked } = e.target;

      if (name === "name") {
        setFormData((prev) => ({
          ...prev,
          name: {
            val,
            err: !val
              ? "Role name is required"
              : !isValidGeneralName(val)
                ? "Role name is invalid"
                : undefined,
          },
        }));
        return;
      }

      // Handle permission selection logic
      const permissionId = name.split("select-permission-")[1];
      if (permissionId === "all") {
        setFormData((prev) => ({
          ...prev,
          permissions: {
            val: checked ? "all" : [],
          },
        }));
        return;
      }

      setFormData((prev) => {
        let updatedSelectedPermissionsIds: string[] | "all" = [];

        if (prev.permissions.val === "all") {
          if (!checked) {
            updatedSelectedPermissionsIds = permissions.permissions
              .filter((permission) => permission.id !== permissionId)
              .map((permission) => permission.id);
          } else {
            updatedSelectedPermissionsIds = "all";
          }
        } else {
          updatedSelectedPermissionsIds = [...prev.permissions.val];

          if (checked) {
            updatedSelectedPermissionsIds.push(permissionId);
          } else {
            updatedSelectedPermissionsIds =
              updatedSelectedPermissionsIds.filter((id) => id !== permissionId);
          }
        }

        return {
          ...prev,
          permissions: {
            val:
              updatedSelectedPermissionsIds.length ===
              permissions.permissions.length
                ? "all"
                : updatedSelectedPermissionsIds,
          },
        };
      });
    },
    [process.isProcessing, permissions],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!role) {
        toast.error("Role data is not available.");
        return;
      }
      if (!canEditRole) {
        toast.error("You don't have permission to update role information.");
        return;
      }
      if (!permissions) {
        toast.error("Permissions data is not loaded yet. Please wait.");
        return;
      }

      const validateForm = (): boolean => {
        let isValid = true;
        const newFormData: FormData = { ...formData };

        if (!formData.name.val) {
          newFormData.name.err = "Role name is required";
          isValid = false;
        } else if (!isValidGeneralName(formData.name.val)) {
          newFormData.name.err = "Role name is invalid";
          isValid = false;
        }

        setFormData(newFormData);
        return isValid;
      };

      if (validateForm()) {
        setProcess((prev) => ({
          ...prev,
          isProcessing: true,
          isUpdating: true,
        }));

        const getChangedData = (): RoleUpdate => {
          const changedData: RoleUpdate = {};

          if (formData.name.val !== role.name) {
            changedData.name = formData.name.val;
          }

          const currentPermissionIds = role.permissions.map((p) => p.id);
          const newPermissionIds =
            formData.permissions.val === "all"
              ? permissions.permissions.map((p) => p.id)
              : formData.permissions.val;

          if (!compareList(currentPermissionIds, newPermissionIds)) {
            changedData.permissionIds =
              newPermissionIds.length > 0 ? newPermissionIds : null;
          }

          return changedData;
        };

        try {
          const changedData = getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          const updatedRole = await updateRole(role.id, changedData);
          setRole((prev) => (prev ? { ...prev, ...updatedRole } : prev));
          toast.success("Role information updated successfully.");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUpdating: false,
          }));
        }
      }
    },
    [
      canEditRole,
      formData,
      permissions,
      process.isProcessing,
      role,
      updateRole,
    ],
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate(-1);
  }, [navigate, process.isProcessing]);

  const genPermissionsTable = useCallback((): JSX.Element => {
    if (!permissions || !permissionsMatrix) {
      return <p>Loading permissions...</p>;
    }

    return (
      <>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="fs-5 mb-0">Permissions ({permissions?.total || 0})</h2>
          <div className="form-check mb-0">
            <input
              type="checkbox"
              className="form-check-input"
              id="select-permission-all"
              name="select-permission-all"
              checked={formData.permissions.val === "all"}
              onChange={handleChange}
              disabled={process.isProcessing}
            />
            <label
              className="form-check-label fw-semibold"
              htmlFor="select-permission-all"
            >
              Select All
            </label>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "30%" }}>Category</th>
                  <th className="text-center" style={{ width: "17.5%" }}>
                    Create
                  </th>
                  <th className="text-center" style={{ width: "17.5%" }}>
                    Read
                  </th>
                  <th className="text-center" style={{ width: "17.5%" }}>
                    Update
                  </th>
                  <th className="text-center" style={{ width: "17.5%" }}>
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.map(({ category, operations }) => (
                  <tr key={category}>
                    <td>
                      <span className="fw-medium text-capitalize">
                        {category}
                      </span>
                    </td>
                    {PERMISSION_OPERATIONS.map((operation) => {
                      const permission = operations[operation];
                      return (
                        <td key={operation} className="text-center">
                          {permission ? (
                            <div className="d-flex align-items-center justify-content-center">
                              <input
                                type="checkbox"
                                className="form-check-input m-0"
                                id={`select-permission-${permission.id}`}
                                name={`select-permission-${permission.id}`}
                                checked={
                                  formData.permissions.val === "all" ||
                                  formData.permissions.val.includes(
                                    permission.id,
                                  )
                                }
                                onChange={handleChange}
                                disabled={process.isProcessing}
                                title={capFirstLetter(permission.name)}
                              />
                              <label
                                className="form-check-label visually-hidden"
                                htmlFor={`select-permission-${permission.id}`}
                              >
                                {permission.name}
                              </label>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }, [
    formData.permissions.val,
    handleChange,
    permissions,
    permissionsMatrix,
    process.isProcessing,
  ]);

  return (
    <>
      {process.isInitializing ? (
        <p>Loading...</p> // TODO Skeleton loading
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !role ? (
        <ApiError errorMessage="Role data not found." />
      ) : !permissions || !permissionsMatrix ? (
        <ApiError errorMessage="Permissions data not found." />
      ) : (
        <>
          <Title
            title={`Update Role #ID ${role.id}`}
            parentTitle="Role Management"
            parentLink="/admin/roles"
            className="mb-4"
          />

          <form onSubmit={handleSubmit} id="editRoleForm">
            <div className="row">
              {/* Left Column - Form */}
              <div className="col-lg-8">
                {/* General Information */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">General Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <Label htmlFor="name" required>
                        Role Name
                      </Label>
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder={role.name}
                        value={formData.name.val}
                        onChange={handleChange}
                        error={formData.name.err}
                        disabled={process.isProcessing}
                        required
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="card shadow-sm mb-4">
                  {genPermissionsTable()}
                </div>
              </div>

              {/* Right Column - Additional Info */}
              <div className="col-lg-4">
                {/* Summary */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Summary</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <span className="form-label fw-bold">Role Name</span>
                      <p className="mb-0 text-capitalize">
                        {formData.name.val || (
                          <span className="text-muted">Not set</span>
                        )}
                      </p>
                    </div>

                    <div className="mb-3">
                      <span className="form-label fw-bold">Users Assigned</span>
                      <p className="mb-0">{role.userAssigned} user(s)</p>
                    </div>

                    <div className="mb-3">
                      <span className="form-label fw-bold">
                        Selected Permissions
                      </span>
                      <p className="mb-0">
                        {formData.permissions.val === "all"
                          ? permissions.total
                          : formData.permissions.val.length}{" "}
                        of {permissions.total} permission(s)
                      </p>
                    </div>

                    {formData.permissions.val !== "all" &&
                      formData.permissions.val.length > 0 && (
                        <div>
                          <span className="form-label fw-bold d-block mb-2">
                            Selected:
                          </span>
                          <div className="d-flex flex-wrap gap-1">
                            {formData.permissions.val.map((permId) => {
                              const perm = permissions.permissions.find(
                                (p) => p.id === permId,
                              );
                              return (
                                <span
                                  key={permId}
                                  className="badge bg-primary-subtle text-primary-emphasis"
                                  title={perm?.name}
                                >
                                  {perm?.code}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* Additional Information */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Additional Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <span className="form-label fw-bold">ID</span>
                      <p className="mb-0 text-muted">{role.id}</p>
                    </div>

                    <div className="mb-3">
                      <span className="form-label fw-bold mb-1 d-block">
                        Created by
                      </span>
                      <DetailUserLink
                        userId={role.createdBy.id}
                        title="View user details"
                        disabled={!canReadUser}
                        disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                      >
                        {role.createdBy.fullName}
                      </DetailUserLink>
                    </div>

                    <div className="mb-3">
                      <span className="form-label fw-bold">Created at</span>
                      <p className="mb-0">
                        {new Date(role.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mb-3">
                      <span className="form-label fw-bold">Updated at</span>
                      <p className="mb-0">
                        {new Date(role.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div className="card shadow-sm mb-4 border-info">
                  <div className="card-body">
                    <h3 className="fs-6 fw-bold mb-2">
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className="me-2 text-info"
                      />
                      Note
                    </h3>
                    <p className="small text-muted mb-0">
                      Changing permissions will affect all users assigned to
                      this role. Changes take effect immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDiscard}
                disabled={process.isProcessing}
              >
                Discard
              </button>
              <Btn
                type="submit"
                className="btn btn-primary"
                disabled={process.isProcessing}
                loading={process.isUpdating}
                form="editRoleForm"
              >
                Update Role
              </Btn>
            </div>
          </form>
        </>
      )}
    </>
  );
}
