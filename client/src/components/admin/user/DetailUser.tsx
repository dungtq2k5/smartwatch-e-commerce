import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useRoleStore from "../../../store/admin/roleStore";
import type { AdminUserDetailsResponse } from "../../../../../common/types.common";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import useUserStore from "../../../store/admin/userStore";
import defaultAvatar from "../../../assets/default-avatar.webp";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBank, faCreditCard } from "@fortawesome/free-solid-svg-icons";
import { CARD_BRAND_ICONS } from "../../../configs";
import useRefreshStore from "../../../store/admin/refreshStore";
import DetailUserSkeleton from "../skeleton/DetailUserSkeleton";
import Title from "../Title";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import LinkBtn from "../../common/LinkBtn";
import DetailUserLink from "../DetailUserLink";

export default function DetailUser() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailUser render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { allRolesLite: roles, fetchAllRoles } = useRoleStore();
  const { fetchUserDetails } = useUserStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const canEditUser = useHasPermission("u_usr");

  const [userDetails, setUserDetails] =
    useState<AdminUserDetailsResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data: roles, userDetail
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("User ID is missing");

        const [fetchedUserDetail] = await Promise.all([
          fetchUserDetails(id),
          roles ? Promise.resolve() : fetchAllRoles(),
        ]);

        setUserDetails(fetchedUserDetail);
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
        <DetailUserSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !roles ? (
        <ApiError errorMessage="Roles data not found." />
      ) : !userDetails ? (
        <ApiError errorMessage="User detail data not found." />
      ) : (
        <>
          {/* Heading CHECKPOINT... */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Title
              title={`Detail User #ID - ${userDetails.id}`}
              parentTitle="User Management"
              parentLink="/admin/users"
            />
            {canEditUser && (
              <LinkBtn to="./edit" className="btn btn-primary">
                Edit this User
              </LinkBtn>
            )}
          </div>

          <div className="row">
            <div className="col-lg-4">
              {/* User Profile Card */}
              <div className="card text-center mb-4">
                <div className="card-body">
                  <img
                    src={userDetails.avatarUrl || defaultAvatar}
                    alt={userDetails.fullName}
                    className="avatar--lg--g mb-3 rounded-circle"
                  />
                  <p className="fs-5 card-title mb-0">{userDetails.fullName}</p>
                  {userDetails.email && (
                    <p className="text-muted mb-1">
                      {userDetails.email}{" "}
                      <span
                        className={`badge ${
                          userDetails.isEmailVerified
                            ? "bg-success-subtle text-success-emphasis"
                            : "bg-warning-subtle text-warning-emphasis"
                        }`}
                      >
                        {userDetails.isEmailVerified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </p>
                  )}
                  {userDetails.phoneNumber && (
                    <p className="text-muted mb-0">
                      {userDetails.phoneNumber}{" "}
                      <span
                        className={`badge ${
                          userDetails.isPhoneNumberVerified
                            ? "bg-success-subtle text-success-emphasis"
                            : "bg-warning-subtle text-warning-emphasis"
                        }`}
                      >
                        {userDetails.isPhoneNumberVerified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* User Details Card */}
              <div className="card mb-4">
                <div className="card-header">
                  <h2 className="fs-6 mb-0">Account Details</h2>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5">User ID</dt>
                    <dd
                      className="col-sm-7 text-truncate"
                      title={userDetails.id}
                    >
                      {userDetails.id}
                    </dd>

                    <dt className="col-sm-5">Stripe Account ID</dt>
                    <dd
                      className="col-sm-7 text-truncate"
                      title={userDetails.stripeCustomerId || "N/A"}
                    >
                      {userDetails.stripeCustomerId || "N/A"}
                    </dd>

                    <dt className="col-sm-5">Gender</dt>
                    <dd className="col-sm-7 text-capitalize">
                      {userDetails.gender}
                    </dd>

                    <dt className="col-sm-5">Birth Date</dt>
                    <dd className="col-sm-7">
                      {userDetails.birth
                        ? new Date(userDetails.birth).toLocaleDateString()
                        : "N/A"}
                    </dd>

                    <dt className="col-sm-5">Balance</dt>
                    <dd className="col-sm-7">
                      {centsToUSD(userDetails.userBalanceCents)}
                    </dd>

                    <dt className="col-sm-5">Auth Provider</dt>
                    <dd className="col-sm-7 text-capitalize">
                      {userDetails.authProvider}
                    </dd>

                    <dt className="col-sm-5">Account Status</dt>
                    <dd className="col-sm-7">
                      <span
                        className={`badge ${
                          userDetails.isLocked
                            ? "bg-danger-subtle text-danger-emphasis"
                            : "bg-success-subtle text-success-emphasis"
                        }`}
                      >
                        {userDetails.isLocked ? "Locked" : "Active"}
                      </span>
                    </dd>

                    <dt className="col-sm-5">Last Login</dt>
                    <dd className="col-sm-7">
                      {userDetails.lastLogin
                        ? new Date(userDetails.lastLogin).toLocaleString()
                        : "Never"}
                    </dd>

                    <dt className="col-sm-5">Joined(Created At)</dt>
                    <dd className="col-sm-7">
                      {new Date(userDetails.createdAt).toLocaleString()}
                    </dd>

                    <dt className="col-sm-5">Last Updated</dt>
                    <dd className="col-sm-7">
                      {new Date(userDetails.updatedAt).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>

              {/* Roles Card */}
              <div className="card">
                <div className="card-header">
                  <h2 className="fs-6 mb-0">Roles</h2>
                </div>
                <div className="list-group list-group-flush">
                  {userDetails.roles.length > 0 ? (
                    userDetails.roles.map((userRole) => {
                      const roleInfo = roles.roles.find(
                        (r) => r.id === userRole.id,
                      );
                      return (
                        <div key={userRole.id} className="list-group-item">
                          <p className="mb-1 fw-bold text-capitalize">
                            {roleInfo?.name || "Unknown Role"}
                          </p>
                          <small className="text-muted d-block">
                            Assigned:{" "}
                            {new Date(userRole.assignedAt).toLocaleString()}
                          </small>
                          <small
                            className="text-muted d-block text-truncate"
                            title={userRole.assignedBy}
                          >
                            By:{" "}
                            <DetailUserLink userId={userRole.assignedBy}>
                              {userRole.assignedBy}
                            </DetailUserLink>
                          </small>
                        </div>
                      );
                    })
                  ) : (
                    <div className="list-group-item">
                      <p className="text-muted mb-0">No roles assigned.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              {/* Addresses Card */}
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="fs-6 mb-0">
                    Addresses ({userDetails.addresses.total})
                  </h2>
                </div>
                <div className="card-body">
                  {userDetails.addresses.addresses.map((address) => (
                    <div key={address.id} className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between">
                        <p className="fw-bold mb-1">
                          {address.name}{" "}
                          {address.isDefault && (
                            <span className="badge bg-primary-subtle text-primary-emphasis">
                              Default
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="mb-1">{address.fullAddress}</p>
                      <p className="text-muted mb-0">{address.phoneNumber}</p>
                    </div>
                  ))}
                  {userDetails.addresses.total === 0 && (
                    <p className="text-muted mb-0">No addresses found.</p>
                  )}
                </div>
              </div>

              {/* Payment Methods Card */}
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="fs-6 mb-0">
                    Payment Methods ({userDetails.paymentMethods.total})
                  </h2>
                </div>
                <div className="card-body">
                  {userDetails.paymentMethods.methods.map((method) => (
                    <div
                      key={method.id}
                      className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom"
                    >
                      <div className="d-flex align-items-center gap-3">
                        {CARD_BRAND_ICONS[method.card.brand.toLowerCase()] || (
                          <FontAwesomeIcon icon={faCreditCard} size="2x" />
                        )}
                        <div>
                          <p className="fw-bold mb-1 text-capitalize">
                            {method.card.brand} **** {method.card.last4}{" "}
                            {method.isDefault && (
                              <span className="badge bg-primary-subtle text-primary-emphasis">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-muted mb-0 small">
                            Expires {method.card.expMonth}/{method.card.expYear}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {userDetails.paymentMethods.total === 0 && (
                    <p className="text-muted mb-0">No payment methods found.</p>
                  )}
                </div>
              </div>

              {/* Bank Accounts Card */}
              <div className="card mb-2">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="fs-6 mb-0">
                    Bank Accounts ({userDetails.bankAccounts.total})
                  </h2>
                </div>
                <div className="card-body">
                  {userDetails.bankAccounts.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom"
                    >
                      <div className="d-flex align-items-center gap-3">
                        <FontAwesomeIcon icon={faBank} size="2x" />
                        <div>
                          <p className="fw-bold mb-1">
                            {account.bankName} **** {account.last4}{" "}
                            {account.isDefault && (
                              <span className="badge bg-primary-subtle text-primary-emphasis">
                                Default
                              </span>
                            )}
                          </p>
                          <p className="text-muted mb-0 small">
                            {account.accountHolderName}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`badge ${
                            account.isVerified
                              ? "bg-success-subtle text-success-emphasis"
                              : "bg-warning-subtle text-warning-emphasis"
                          }`}
                        >
                          {account.isVerified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {userDetails.bankAccounts.total === 0 && (
                    <p className="text-muted mb-0">No bank accounts found.</p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(-1)}
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
