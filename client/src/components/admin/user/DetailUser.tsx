import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

export default function DetailUser() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailUser render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { roles, fetchRoles } = useRoleStore();
  const { sysUserId, fetchSysUserId, fetchUserDetails } = useUserStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [userDetail, setUserDetail] = useState<AdminUserDetailsResponse | null>(
    null
  );
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
          roles ? Promise.resolve() : fetchRoles(),
          sysUserId ? Promise.resolve() : fetchSysUserId(),
        ]);

        setUserDetail(fetchedUserDetail);
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
        <ApiError errMsg={apiErr} />
      ) : !roles ? (
        <ApiError errMsg="Roles data not found." />
      ) : !userDetail ? (
        <ApiError errMsg="User detail data not found." />
      ) : !sysUserId ? (
        <ApiError errMsg="System user ID not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <h1 className="fs-2 mb-0 d-flex gap-2">
                <Link
                  to={"/admin/users"}
                  className="text-decoration-none text-black"
                >
                  User Management
                </Link>
                <p className="mb-0 fw-light">/</p>
                User #ID {userDetail.id}
              </h1>
            </div>
            <Link to={`./edit`} className="btn btn-primary">
              Edit this User
            </Link>
          </div>

          <div className="row">
            <div className="col-lg-4">
              {/* User Profile Card */}
              <div className="card text-center mb-4">
                <div className="card-body">
                  <img
                    src={userDetail.avatarUrl || defaultAvatar}
                    alt={userDetail.fullName}
                    className="avatar--lg--g mb-3 rounded-circle"
                  />
                  <p className="fs-5 card-title mb-0">{userDetail.fullName}</p>
                  {userDetail.email && (
                    <p className="text-muted mb-1">
                      {userDetail.email}{" "}
                      <span
                        className={`badge ${
                          userDetail.isEmailVerified
                            ? "bg-success-subtle text-success-emphasis"
                            : "bg-warning-subtle text-warning-emphasis"
                        }`}
                      >
                        {userDetail.isEmailVerified
                          ? "Verified"
                          : "Not Verified"}
                      </span>
                    </p>
                  )}
                  {userDetail.phoneNumber && (
                    <p className="text-muted mb-0">
                      {userDetail.phoneNumber}{" "}
                      <span
                        className={`badge ${
                          userDetail.isPhoneNumberVerified
                            ? "bg-success-subtle text-success-emphasis"
                            : "bg-warning-subtle text-warning-emphasis"
                        }`}
                      >
                        {userDetail.isPhoneNumberVerified
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
                      title={userDetail.id}
                    >
                      {userDetail.id}
                    </dd>

                    <dt className="col-sm-5">Stripe Account ID</dt>
                    <dd
                      className="col-sm-7 text-truncate"
                      title={userDetail.stripeCustomerId || "N/A"}
                    >
                      {userDetail.stripeCustomerId || "N/A"}
                    </dd>

                    <dt className="col-sm-5">Gender</dt>
                    <dd className="col-sm-7 text-capitalize">
                      {userDetail.gender}
                    </dd>

                    <dt className="col-sm-5">Birth Date</dt>
                    <dd className="col-sm-7">
                      {userDetail.birth
                        ? new Date(userDetail.birth).toLocaleDateString()
                        : "N/A"}
                    </dd>

                    <dt className="col-sm-5">Balance</dt>
                    <dd className="col-sm-7">
                      {centsToUSD(userDetail.userBalanceCents)}
                    </dd>

                    <dt className="col-sm-5">Auth Provider</dt>
                    <dd className="col-sm-7 text-capitalize">
                      {userDetail.authProvider}
                    </dd>

                    <dt className="col-sm-5">Account Status</dt>
                    <dd className="col-sm-7">
                      <span
                        className={`badge ${
                          userDetail.isLocked
                            ? "bg-danger-subtle text-danger-emphasis"
                            : "bg-success-subtle text-success-emphasis"
                        }`}
                      >
                        {userDetail.isLocked ? "Locked" : "Active"}
                      </span>
                    </dd>

                    <dt className="col-sm-5">Last Login</dt>
                    <dd className="col-sm-7">
                      {userDetail.lastLogin
                        ? new Date(userDetail.lastLogin).toLocaleString()
                        : "Never"}
                    </dd>

                    <dt className="col-sm-5">Joined(Created At)</dt>
                    <dd className="col-sm-7">
                      {new Date(userDetail.createdAt).toLocaleString()}
                    </dd>

                    <dt className="col-sm-5">Last Updated</dt>
                    <dd className="col-sm-7">
                      {new Date(userDetail.updatedAt).toLocaleString()}
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
                  {userDetail.roles.length > 0 ? (
                    userDetail.roles.map((userRole) => {
                      const roleInfo = roles.roles.find(
                        (r) => r.id === userRole.id
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
                            {userRole.assignedBy === sysUserId ? (
                              "system"
                            ) : (
                              <Link to={`/admin/users/${userRole.assignedBy}`}>
                                {userRole.assignedBy}
                              </Link>
                            )}
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
                    Addresses ({userDetail.addresses.total})
                  </h2>
                </div>
                <div className="card-body">
                  {userDetail.addresses.addresses.map((address) => (
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
                  {userDetail.addresses.total === 0 && (
                    <p className="text-muted mb-0">No addresses found.</p>
                  )}
                </div>
              </div>

              {/* Payment Methods Card */}
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="fs-6 mb-0">
                    Payment Methods ({userDetail.paymentMethods.total})
                  </h2>
                </div>
                <div className="card-body">
                  {userDetail.paymentMethods.methods.map((method) => (
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
                  {userDetail.paymentMethods.total === 0 && (
                    <p className="text-muted mb-0">No payment methods found.</p>
                  )}
                </div>
              </div>

              {/* Bank Accounts Card */}
              <div className="card mb-2">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h2 className="fs-6 mb-0">
                    Bank Accounts ({userDetail.bankAccounts.total})
                  </h2>
                </div>
                <div className="card-body">
                  {userDetail.bankAccounts.accounts.map((account) => (
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
                  {userDetail.bankAccounts.total === 0 && (
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
