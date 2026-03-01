import { memo } from "react";
import type { ProviderAddressResponse } from "../../../../../common/types.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocation } from "@fortawesome/free-solid-svg-icons";
import DetailUserLink from "../DetailUserLink";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import MapLink from "../../common/MapLink";

type ProviderAddressCardProps = Readonly<{
  address: ProviderAddressResponse;
  canReadUser: boolean;
  canEditProvider: boolean;
  onEdit?: (addressId: string) => void;
  onDelete?: (addressId: string) => void;
}>;

const ProviderAddressCard = memo(
  ({
    address,
    canEditProvider,
    canReadUser,
    onEdit,
    onDelete,
  }: ProviderAddressCardProps) => {
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
                  <span className="badge bg-primary ms-2">Default</span>
                )}
              </h3>
              <div className="d-flex gap-3">
                <MapLink
                  latitude={latitude}
                  longitude={longitude}
                >
                  <FontAwesomeIcon icon={faMapLocation} size="lg" />
                </MapLink>
                {canEditProvider && (
                  <>
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => onEdit?.(address.id)}
                      title="Edit this Address"
                    >
                      Edit
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        className="btn btn-link p-0 text-danger"
                        onClick={() => onDelete?.(address.id)}
                        title="Delete this Address"
                        disabled={address.isDefault}
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-muted small d-block">Address:</strong>
              <p className="mb-0">
                {address.addressLine1}
                {address.addressLine2 && `, ${address.addressLine2}`}
              </p>
              <p className="mb-0">
                {address.locality}, {address.adminAreaL1}
                {address.adminAreaL2 && `, ${address.adminAreaL2}`}
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
                <strong className="text-muted small d-block">Notes:</strong>
                <p className="mb-0">{address.notes}</p>
              </div>
            )}

            <div className="mb-2">
              <strong className="text-muted small d-block">Coordinates:</strong>
              <p className="mb-0">
                Lat: {address.location.coordinates[0]}, Lon:{" "}
                {address.location.coordinates[1]}
              </p>
            </div>

            <hr className="my-2" />

            <div className="row g-2 small text-muted">
              <div className="col-6">
                <strong>Created:</strong>
                <br />
                {new Date(address.createdAt).toLocaleString()}
              </div>
              <div className="col-6">
                <strong>Updated:</strong>
                <br />
                {new Date(address.updatedAt).toLocaleString()}
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
  },
);

export default ProviderAddressCard;
