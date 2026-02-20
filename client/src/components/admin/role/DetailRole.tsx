import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useRoleStore from "../../../store/admin/roleStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { RoleDetailsResponse } from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import LinkBtn from "../../common/LinkBtn";
import type {
  GroupedPermissions,
  PermissionFromRoleDetails,
} from "../../../utils/types";
import DetailUserLink from "../DetailUserLink";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import { getGroupedPermissions } from "../../../utils/utils";

export default function DetailRole() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailRole render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { fetchRoleDetails } = useRoleStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditRole, canReadUser] = [
    useHasPermission("u_usr_role"),
    useHasPermission("r_usr"),
  ];

  const [roleDetails, setRoleDetails] = useState<RoleDetailsResponse | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const groupedPermissions =
    useMemo((): GroupedPermissions<PermissionFromRoleDetails> | null => {
      if (!roleDetails) return null;

      return getGroupedPermissions(roleDetails.permissions.permissions);
    }, [roleDetails]);

  // Fetch and set initial data: roleDetails, permissions for grouping
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Role ID is missing");

        const fetchedRoleDetails = await fetchRoleDetails(id);
        setRoleDetails(fetchedRoleDetails);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setIsInitializing(false);
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshSignal]);

  return (
    <>
      {isInitializing ? (
        <p>Loading...</p> // TODO Loading skeleton
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !roleDetails ? (
        <ApiError errorMessage="Role details not found." />
      ) : !groupedPermissions ? (
        <ApiError errorMessage="Role's permissions not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Title
              title={`Detail Role - ${roleDetails.name}`}
              parentTitle="Role Management"
              parentLink="/admin/roles"
            />
            {canEditRole && (
              <LinkBtn to="./edit" className="btn btn-primary">
                Edit this Role
              </LinkBtn>
            )}
          </div>

          <div className="row">
            {/* Left Column */}
            <div className="col-lg-8">
              {/* General Information Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">General Information</h2>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3">Role Name</dt>
                    <dd className="col-sm-9 text-capitalize">
                      {roleDetails.name}
                    </dd>

                    <dt className="col-sm-3">Users Assigned</dt>
                    <dd className="col-sm-9">
                      {roleDetails.userAssigned} user(s)
                    </dd>

                    <dt className="col-sm-3">Total Permissions</dt>
                    <dd className="col-sm-9">
                      {roleDetails.permissions.total} permission(s)
                    </dd>
                  </dl>
                </div>
              </div>

              {/* Permissions Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">
                    Permissions ({roleDetails.permissions.total})
                  </h2>
                </div>
                <div className="card-body">
                  {roleDetails.permissions.total === 0 ? (
                    <p className="text-muted mb-0">
                      No permissions assigned to this role.
                    </p>
                  ) : (
                    <div className="row g-3">
                      {Object.entries(groupedPermissions).map(
                        ([category, categoryPermissions]) => (
                          <div key={category} className="col-12">
                            <div className="card border">
                              <div className="card-header bg-light">
                                <h3 className="fs-6 fw-semibold mb-0 text-capitalize">
                                  {category}
                                </h3>
                              </div>
                              <div className="card-body">
                                <div className="row g-2">
                                  {categoryPermissions.map((permission) => (
                                    <div
                                      key={permission.id}
                                      className="col-md-6 col-lg-4"
                                    >
                                      <div className="d-flex align-items-start gap-2">
                                        <span className="badge bg-primary-subtle text-primary-emphasis">
                                          {permission.code}
                                        </span>
                                        <div className="flex-grow-1">
                                          <p className="mb-1 fw-medium">
                                            {capFirstLetter(permission.name)}
                                          </p>
                                          <small className="text-muted d-block">
                                            Assigned:{" "}
                                            {new Date(
                                              permission.assignedAt,
                                            ).toLocaleDateString()}
                                          </small>
                                          {canReadUser && (
                                            <small className="text-muted d-block">
                                              By:{" "}
                                              <DetailUserLink
                                                userId={
                                                  permission.assignedBy.id
                                                }
                                                title="View user details"
                                                disabled={!canReadUser}
                                                disabledtitle={
                                                  DISABLED_TITLE_FOR_VIEWING
                                                }
                                              >
                                                {permission.assignedBy.fullName}
                                              </DetailUserLink>
                                            </small>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Additional Info */}
            <div className="col-lg-4">
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">Additional Information</h2>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <span className="form-label fw-bold">ID</span>
                    <p className="mb-0 text-muted">{roleDetails.id}</p>
                  </div>

                  <div className="mb-3">
                    <span className="form-label fw-bold mb-1 d-block">
                      Created by
                    </span>
                    <DetailUserLink
                      userId={roleDetails.createdBy.id}
                      title="View user details"
                      disabled={!canReadUser}
                      disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                    >
                      {roleDetails.createdBy.fullName}
                    </DetailUserLink>
                  </div>

                  <div className="mb-3">
                    <span className="form-label fw-bold">Created at</span>
                    <p className="mb-0">
                      {new Date(roleDetails.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mb-3">
                    <span className="form-label fw-bold">Updated at</span>
                    <p className="mb-0">
                      {new Date(roleDetails.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </button>
          </div>
        </>
      )}
    </>
  );
}
