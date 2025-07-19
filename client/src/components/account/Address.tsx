import { faPlus, faSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useUserAddressStore } from "../../store/addressStore";
import { useCallback, useEffect, useRef, useState } from "react";
import Loading from "../Loading";
import ApiError from "../ApiError";
import DeleteConfirmModal from "../ConfirmDeleteModal";
import toast from "react-hot-toast";
import CreateAddressModal from "../CreateAddressModal";
import UpdateAddressModal from "../UpdateAddressModal";
import { formatError } from "../../utils/utils";

type ModalState = {
  create: boolean;
  addressIdToUpdate?: string;
  addressIdToDelete?: string;
};

export default function Address() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Address render count:", renderCount.current);

  const {
    addresses,
    isFetching,
    fetchErr,
    isLoading,
    fetchAddresses,
    deleteAddress,
    updateAddress,
  } = useUserAddressStore();

  const [modalState, setModalState] = useState<ModalState>({
    create: false,
    addressIdToUpdate: undefined,
    addressIdToDelete: undefined,
  });

  useEffect((): void => {
    fetchAddresses();
  }, [fetchAddresses]);

  const closeModal = useCallback((): void => {
    setModalState({
      create: false,
      addressIdToUpdate: undefined,
      addressIdToDelete: undefined,
    });
  }, []);

  const handleDeleteAddress = useCallback(async (): Promise<void> => {
    if (!modalState.addressIdToDelete) return;
    try {
      await deleteAddress(modalState.addressIdToDelete);
      toast.success("Address deleted successfully.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [deleteAddress, modalState.addressIdToDelete]);

  const handleSetDefaultAddress = useCallback(
    async (addressId: string): Promise<void> => {
      try {
        await updateAddress({ isDefault: true }, addressId);
        toast.success("Default address set successfully.");
      } catch (error) {
        toast.error(formatError(error));
      }
    },
    [updateAddress]
  );

  return (
    <>
      {isFetching ? (
        <Loading loadingMsg="Hang on we are loading your addresses..." />
      ) : fetchErr ? (
        <ApiError errMsg={fetchErr} />
      ) : !addresses ? (
        <ApiError errMsg="Could not load addresses." />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 card-title mb-0">My Addresses</h1>
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={() =>
                setModalState((prev) => ({ ...prev, create: true }))
              }
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faPlus} size="sm" /> Add new address
            </button>
          </div>

          {addresses.total === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">
                You have not added any addresses yet.
              </p>
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={() =>
                  setModalState((prev) => ({ ...prev, create: true }))
                }
                disabled={isLoading}
              >
                Add new address
              </button>
            </div>
          ) : (
            <div className="list-group">
              {addresses.addresses.map((address) => (
                <div
                  key={address.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  {/* Left side */}
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h3 className="h5 mb-1">{address.name}</h3>
                      <FontAwesomeIcon icon={faSlash} rotation={90} size="sm" />
                      <small className="text-muted">
                        {address.phoneNumber}
                      </small>
                    </div>
                    <p className="mb-0">{address.fullAddress}</p>
                    {address.isDefault && (
                      <span className="badge text-bg-primary">Default</span>
                    )}
                  </div>
                  {/* Right side */}
                  <div className="ms-3 text-end d-flex flex-column gap-1 align-items-end">
                    <div>
                      <button
                        type="button"
                        className="btn btn-link p-0 me-2"
                        onClick={() =>
                          setModalState((prev) => ({
                            ...prev,
                            addressIdToUpdate: address.id,
                          }))
                        }
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      {addresses.total > 1 && !address.isDefault && (
                        <button
                          type="button"
                          className="btn btn-link p-0 text-danger"
                          onClick={() =>
                            setModalState((prev) => ({
                              ...prev,
                              addressIdToDelete: address.id,
                            }))
                          }
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {!address.isDefault && (
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => handleSetDefaultAddress(address.id)}
                        disabled={isLoading}
                      >
                        Set as default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modals */}
          <DeleteConfirmModal
            title="Are you sure you want to delete this address? This action cannot be undone."
            show={modalState.addressIdToDelete !== undefined}
            onHide={closeModal}
            onDelete={handleDeleteAddress}
          />

          <CreateAddressModal
            isFirstAddress={addresses.total === 0}
            show={modalState.create}
            onHide={closeModal}
          />

          {modalState.addressIdToUpdate && (
            <UpdateAddressModal
              isOnlyOneAddress={addresses.total === 1}
              addressId={modalState.addressIdToUpdate}
              show={modalState.addressIdToUpdate !== undefined}
              onHide={closeModal}
            />
          )}
        </>
      )}
    </>
  );
}
