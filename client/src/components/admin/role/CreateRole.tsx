import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { useNavigate } from "react-router-dom";
import useRoleStore from "../../../store/admin/roleStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { FormData } from "./EditRole";
import usePermissionStore from "../../../store/admin/permissionStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import {
  capFirstLetter,
  formatError,
  isValidGeneralName,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { PERMISSION_OPERATIONS, WAITING_EMOJI } from "../../../configs";
import type { RoleCreate } from "../../../../../common/types.common";
import Title from "../Title";
import Label from "../../common/Label";
import Input from "../../common/Input";
import ApiError from "../../common/ApiError";
import Btn from "../../common/Btn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faPlus } from "@fortawesome/free-solid-svg-icons";
import {
  getGroupedPermissions,
  getPermissionsMatrix,
} from "../../../utils/utils";
import type { PermissionMatrix } from "../../../utils/types";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isCreating: boolean;
};

export default function CreateRole() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateRole rendered", renderCount.current);

  const navigate = useNavigate();

  const { createRole } = useRoleStore();
  const { permissions, fetchPermissions } = usePermissionStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const canCreateRole = useHasPermission("c_usr_role");

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isCreating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    permissions: { val: [] },
  });

  const permissionsMatrix = useMemo((): PermissionMatrix[] | null => {
    if (!permissions) return null;

    const grouped = getGroupedPermissions(permissions.permissions);
    return getPermissionsMatrix(grouped);
  }, [permissions]);

  // Fetch set initial when first load
  useEffect(() => {
    const handleFetchSetInitialData = async () => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!permissions) await fetchPermissions();
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
  }, [refreshSignal]);

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
      if (!canCreateRole) {
        toast.error("You don't have permission to create role.");
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
          isCreating: true,
        }));

        try {
          const role: RoleCreate = {
            name: formData.name.val,
            permissionIds:
              formData.permissions.val === "all"
                ? permissions.permissions.map((permission) => permission.id)
                : formData.permissions.val.length > 0
                  ? formData.permissions.val
                  : null,
          };

          const createdRole = await createRole(role);
          navigate(`/admin/roles/${createdRole.id}`);
          toast.success("Role created successfully.");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isCreating: false,
          }));
        }
      }
    },
    [
      canCreateRole,
      createRole,
      formData,
      navigate,
      permissions,
      process.isProcessing,
    ],
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/admin/roles");
  }, [navigate, process.isProcessing]);

  const genPermissionsTable = useCallback((): JSX.Element => {
    if (permissions?.total === 0 || !permissionsMatrix) {
      return (
        <div className="p-4 text-center">
          <p className="text-muted mb-0">
            No permissions available in the system. Please contact
            administrator.
          </p>
        </div>
      );
    }

    return (
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
                  <span className="fw-medium text-capitalize">{category}</span>
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
                              formData.permissions.val.includes(permission.id)
                            }
                            onChange={handleChange}
                            disabled={process.isProcessing}
                            title={capFirstLetter(permission.name)}
                          />
                          <label
                            htmlFor={`select-permission-${permission.id}`}
                            hidden
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
    );
  }, [
    formData.permissions.val,
    handleChange,
    permissions?.total,
    permissionsMatrix,
    process.isProcessing,
  ]);

  return (
    <>
      {process.isInitializing ? (
        <p>Loading...</p> // TODO Skeleton loading
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !permissions || !permissionsMatrix ? (
        <ApiError errorMessage="Permissions data not found." />
      ) : (
        <>
          <Title
            title="Create new Role"
            parentTitle="Role Management"
            parentLink="/admin/roles"
            className="mb-4"
          />

          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Left Column - Role Information */}
              <div className="col-lg-8">
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
                        placeholder="e.g., Staff, Manager, Editor"
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
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h2 className="fs-5 mb-0">
                      Permissions ({permissions.total})
                    </h2>
                    <div className="form-check m-0">
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
                  <div className="card-body p-0">{genPermissionsTable()}</div>
                </div>
              </div>

              {/* Right Column - Summary */}
              <div className="col-lg-4">
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

                <div className="card shadow-sm mb-4 border-warning">
                  <div className="card-body">
                    <h3 className="fs-6 fw-bold mb-2">
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className="me-2 text-warning"
                      />
                      Important Note
                    </h3>
                    <p className="small text-muted mb-0">
                      Permissions determine what actions users with this role
                      can perform. Choose carefully as this affects system
                      security.
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
                loading={process.isCreating}
                icon={<FontAwesomeIcon icon={faPlus} />}
              >
                Create Role
              </Btn>
            </div>
          </form>
        </>
      )}
    </>
  );
}
