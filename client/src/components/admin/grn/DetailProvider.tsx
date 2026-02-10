import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useProviderStore from "../../../store/admin/grn/providerStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { ProviderDetailsResponse } from "../../../../../common/types.common";
import {
  formatError,
  getGoogleMapsUrl,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import LinkBtn from "../../common/LinkBtn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocation } from "@fortawesome/free-solid-svg-icons";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";

export default function DetailProvider() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailProvider render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { fetchProviderDetails } = useProviderStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditProvider, canReadUser] = [
    useHasPermission("u_provider_inventory"),
    useHasPermission("r_usr"),
  ];

  const [providerDetails, setProviderDetails] =
    useState<ProviderDetailsResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data: providerDetails
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("OS ID is missing");

        setProviderDetails(await fetchProviderDetails(id));
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
      ) : !providerDetails ? (
        <ApiError errorMessage="Provider details not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Title
              title={`Detail Provider - ${providerDetails.fullName}`}
              parentTitle="Provider Management"
              parentLink="/admin/providers"
            />
            {canEditProvider && (
              <LinkBtn to="./edit" className="btn btn-primary">
                Edit this Provider
              </LinkBtn>
            )}
          </div>

          <div className="row g-4">
            {/* Left Column: General Info */}
            <div className="col-12 col-xl-4 col-md-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">General Information</h2>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      Provider ID:
                    </strong>
                    <p className="mb-0">{providerDetails.id}</p>
                  </div>

                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      Full Name:
                    </strong>
                    <p className="mb-0">{providerDetails.fullName}</p>
                  </div>

                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">Email:</strong>
                    <p className="mb-0">{providerDetails.email || "N/A"}</p>
                  </div>

                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      Phone Number:
                    </strong>
                    <p className="mb-0">
                      {providerDetails.phoneNumber || "N/A"}
                    </p>
                  </div>

                  <hr className="text-muted opacity-25" />

                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      Created At:
                    </strong>
                    <p className="mb-0">
                      {new Date(providerDetails.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mb-3">
                    <strong className="text-muted d-block mb-1">
                      Updated At:
                    </strong>
                    <p className="mb-0">
                      {new Date(providerDetails.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mb-0">
                    <strong className="text-muted d-block mb-1">
                      Created By:
                    </strong>
                    <DetailUserLink
                      userId={providerDetails.createdBy.id}
                      title="View user details"
                      disabled={!canReadUser}
                      disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                    >
                      {providerDetails.createdBy.fullName}
                    </DetailUserLink>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Addresses */}
            <div className="col-12 col-xl-8 col-md-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">
                    Provider Addresses ({providerDetails.addresses.total})
                  </h2>
                </div>
                <div
                  className="card-body"
                  style={{ maxHeight: "600px", overflowY: "auto" }}
                >
                  {providerDetails.addresses.addresses.length === 0 ? (
                    <p className="text-muted text-center mb-0">
                      No addresses found for this provider.
                    </p>
                  ) : (
                    <div className="row g-3">
                      {providerDetails.addresses.addresses.map((address) => {
                        const [longitude, latitude] = [
                          address.location.coordinates[0],
                          address.location.coordinates[1],
                        ];

                        return (
                          <div key={address.id} className="col-12">
                            <div className="card border">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h3 className="fs-6 mb-0 fw-semibold">
                                    {address.name}
                                    {address.isDefault && (
                                      <span className="badge bg-primary ms-2">
                                        Default
                                      </span>
                                    )}
                                  </h3>
                                  <div className="d-flex gap-3">
                                    <LinkBtn
                                      to={getGoogleMapsUrl(longitude, latitude)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="View on Google Maps"
                                    >
                                      <FontAwesomeIcon
                                        icon={faMapLocation}
                                        className="me-1"
                                      />
                                      Map
                                    </LinkBtn>
                                    {canEditProvider && (
                                      <LinkBtn
                                        to={`./addresses/${address.id}/edit`}
                                        title="Edit this Address"
                                      >
                                        Edit
                                      </LinkBtn>
                                    )}
                                  </div>
                                </div>

                                <div className="mb-2">
                                  <strong className="text-muted small d-block">
                                    Address:
                                  </strong>
                                  <p className="mb-0">
                                    {address.addressLine1}
                                    {address.addressLine2 &&
                                      `, ${address.addressLine2}`}
                                  </p>
                                  <p className="mb-0">
                                    {address.locality}, {address.adminAreaL1}
                                    {address.adminAreaL2 &&
                                      `, ${address.adminAreaL2}`}
                                  </p>
                                  <p className="mb-0">{address.postalCode}</p>
                                </div>

                                <div className="mb-2">
                                  <strong className="text-muted small d-block">
                                    Phone Number:
                                  </strong>
                                  <p className="mb-0">{address.phoneNumber}</p>
                                </div>

                                {address.notes && (
                                  <div className="mb-2">
                                    <strong className="text-muted small d-block">
                                      Notes:
                                    </strong>
                                    <p className="mb-0">{address.notes}</p>
                                  </div>
                                )}

                                <div className="mb-2">
                                  <strong className="text-muted small d-block">
                                    Coordinates:
                                  </strong>
                                  <p className="mb-0">
                                    Lat: {address.location.coordinates[1]}, Lon:{" "}
                                    {address.location.coordinates[0]}
                                  </p>
                                </div>

                                <hr className="my-2" />

                                <div className="row g-2 small text-muted">
                                  <div className="col-6">
                                    <strong>Created:</strong>
                                    <br />
                                    {new Date(
                                      address.createdAt,
                                    ).toLocaleString()}
                                  </div>
                                  <div className="col-6">
                                    <strong>Updated:</strong>
                                    <br />
                                    {new Date(
                                      address.updatedAt,
                                    ).toLocaleString()}
                                  </div>
                                  <div className="col-12">
                                    <strong>Created By:</strong>
                                    <br />
                                    <DetailUserLink
                                      userId={address.createdBy.id}
                                      title="View user details"
                                      disabled={!canReadUser}
                                      disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                                    >
                                      {address.createdBy.fullName}
                                    </DetailUserLink>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end mt-4">
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
