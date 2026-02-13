import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useProviderStore from "../../../store/admin/grn/providerStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  ProviderAddressResponse,
  ProviderDetailsResponse,
} from "../../../../../common/types.common";
import { formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import LinkBtn from "../../common/LinkBtn";
import { DISABLED_TITLE_FOR_VIEWING, WAITING_EMOJI } from "../../../configs";
import ProviderAddressCard from "./ProviderAddressCard";
import CreateProviderAddressModal from "../modal/CreateProviderAddressModal";
import EditProviderAddressModal from "../modal/EditProviderAddressModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import useProviderAddressStore from "../../../store/admin/grn/providerAddressStore";
import toast from "react-hot-toast";
import useProviderWizardStore from "../../../store/admin/wizard/providerWizardStore";

type Modal = {
  createAddress: boolean;
  addressIdToEdit?: string;
  addressIdToDelete?: string;
};

export default function DetailProvider() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailProvider render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const wizard = useProviderWizardStore();
  const { fetchProviderDetails } = useProviderStore();
  const { deleteProviderAddress } = useProviderAddressStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditProvider, canReadUser] = [
    useHasPermission("u_provider_inventory"),
    useHasPermission("r_usr"),
  ];

  const [providerDetails, setProviderDetails] =
    useState<ProviderDetailsResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    createAddress: false,
    addressIdToEdit: undefined,
    addressIdToDelete: undefined,
  });

  // Fetch and set initial data: providerDetails
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("OS ID is missing");

        setProviderDetails(await fetchProviderDetails(id));

        if (
          wizard.isActive &&
          wizard.context.providerId === id &&
          wizard.currStep === "address"
        ) {
          setModal((prev) => ({ ...prev, createAddress: true }));
          wizard.reset();
        }
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setIsInitializing(false);
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshSignal]);

  const handleSubmitDeleteAddress = useCallback(async (): Promise<void> => {
    if (isInitializing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!id) {
      toast.error("Provider ID is missing.");
      return;
    }
    if (!modal.addressIdToDelete) {
      toast.error("No address selected for deletion.");
      return;
    }

    try {
      await deleteProviderAddress(id, modal.addressIdToDelete);

      // Remove deleted address from local state
      setProviderDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          addresses: {
            total: prev.addresses.total - 1,
            addresses: prev.addresses.addresses.filter(
              (addr) => addr.id !== modal.addressIdToDelete,
            ),
          },
        };
      });

      toast.success("Address deleted successfully.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [deleteProviderAddress, id, isInitializing, modal.addressIdToDelete]);

  const onSuccessCreateAddress = useCallback(
    (newAddress: ProviderAddressResponse) => {
      setProviderDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          addresses: {
            total: prev.addresses.total + 1,
            addresses: [...prev.addresses.addresses, newAddress],
          },
        };
      });
    },
    [],
  );

  const onSuccessEditAddress = useCallback(
    (updatedAddress: ProviderAddressResponse) => {
      setProviderDetails((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          addresses: {
            total: prev.addresses.total,
            addresses: prev.addresses.addresses.map((addr) =>
              addr.id === updatedAddress.id ? updatedAddress : addr,
            ),
          },
        };
      });
    },
    [],
  );

  const onEditAddress = useCallback((addressId: string) => {
    setModal((prev) => ({
      ...prev,
      addressIdToEdit: addressId,
    }));
  }, []);

  const onDeleteAddress = useCallback((addressId: string) => {
    setModal((prev) => ({ ...prev, addressIdToDelete: addressId }));
  }, []);

  const closeModal = useCallback((): void => {
    setModal({
      createAddress: false,
      addressIdToEdit: undefined,
      addressIdToDelete: undefined,
    });
  }, []);

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
                  {canEditProvider && (
                    <div>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() =>
                          setModal((prev) => ({ ...prev, createAddress: true }))
                        }
                      >
                        + Create address
                      </button>
                    </div>
                  )}
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
                      {providerDetails.addresses.addresses.map((address) => (
                        <ProviderAddressCard
                          key={address.id}
                          address={address}
                          canEditProvider={canEditProvider}
                          canReadUser={canReadUser}
                          onEdit={onEditAddress}
                          onDelete={onDeleteAddress}
                        />
                      ))}
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

          {/* Modals */}
          <ConfirmSubmitModal
            show={!!modal.addressIdToDelete}
            onHide={closeModal}
            onSubmit={handleSubmitDeleteAddress}
            custom={{
              action: "delete",
              title: "Delete Address",
              body: "Are you sure you want to delete this address? This action cannot be undone.",
              cancelText: "Cancel",
              submitText: "Delete",
            }}
          />

          <CreateProviderAddressModal
            providerId={providerDetails.id}
            isFirstAddress={providerDetails.addresses.total === 0}
            show={modal.createAddress}
            onHide={closeModal}
            onSuccess={onSuccessCreateAddress}
          />

          <EditProviderAddressModal
            providerId={providerDetails.id}
            addressId={modal.addressIdToEdit}
            isOnlyOneAddress={providerDetails.addresses.total === 1}
            onHide={closeModal}
            onSuccess={onSuccessEditAddress}
          />
        </>
      )}
    </>
  );
}
