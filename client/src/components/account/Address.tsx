import { faPlus, faSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useUserAddressStore } from "../../store/addressStore";
import { useCallback, useEffect, useRef, useState } from "react";
import Loading from "../Loading";
import ApiError from "../ApiError";
import ConfirmSubmitModal from "../modal/ConfirmSubmitModal";
import toast from "react-hot-toast";
import CreateAddressModal from "../modal/CreateAddressModal";
import UpdateAddressModal from "../modal/UpdateAddressModal";
import { WAITING_EMOJI } from "../../configs";
import { formatError } from "../../../../common/utils.common";
import SmallSpinner from "../SmallSpinner";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isSettingDefault: boolean;
};

type Modal = {
  create: boolean;
  addressIdToUpdate?: string;
  addressIdToDelete?: string;
};

export default function Address() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Address render count:", renderCount.current);

  const { addresses, fetchAddresses, deleteAddress, updateAddress } =
    useUserAddressStore();

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isSettingDefault: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    create: false,
    addressIdToUpdate: undefined,
    addressIdToDelete: undefined,
  });

  useEffect((): void => {
    const handleFetchAddresses = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isFetching: true,
      }));
      setApiErr(null);

      try {
        await fetchAddresses();
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isFetching: false,
        }));
      }
    };

    handleFetchAddresses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = useCallback((): void => {
    setModal({
      create: false,
      addressIdToUpdate: undefined,
      addressIdToDelete: undefined,
    });
  }, []);

  const handleDeleteAddress = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!modal.addressIdToDelete) {
      toast.error("No address selected for deletion.");
      return;
    }

    try {
      await deleteAddress(modal.addressIdToDelete);
      toast.success("Address deleted successfully.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [process.isProcessing, modal.addressIdToDelete, deleteAddress]);

  const handleSetDefaultAddress = useCallback(
    async (addressId: string): Promise<void> => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isSettingDefault: true,
      }));
      try {
        await updateAddress({ isDefault: true }, addressId);
        toast.success("Default address set successfully.");
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isSettingDefault: false,
        }));
      }
    },
    [process.isProcessing, updateAddress]
  );

  return (
    <>
      {process.isFetching ? (
        <Loading loadingMsg="Hang on we are loading your addresses..." />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !addresses ? (
        <ApiError errMsg="Addresses data not found." />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 card-title">My Addresses</h1>
            <button
              type="button"
              className="btn btn-primary d-flex align-items-center"
              onClick={() =>
                setModal((prev) => ({ ...prev, create: true }))
              }
              disabled={process.isProcessing}
            >
              <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />Add new address
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
                  setModal((prev) => ({ ...prev, create: true }))
                }
                disabled={process.isProcessing}
              >
                Add new address
              </button>
            </div>
          ) : (
            <div className="list-group">
              {addresses.addresses.map((address) => (
                <div
                  key={address.id}
                  className="list-group-item d-flex justify-content-between align-items-center p-3"
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
                        className="btn btn-link p-0 me-3"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            addressIdToUpdate: address.id,
                          }))
                        }
                        disabled={process.isProcessing}
                      >
                        Edit
                      </button>
                      {addresses.total > 1 && !address.isDefault && (
                        <button
                          type="button"
                          className="btn btn-link p-0 text-danger"
                          onClick={() =>
                            setModal((prev) => ({
                              ...prev,
                              addressIdToDelete: address.id,
                            }))
                          }
                          disabled={process.isProcessing}
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
                        disabled={process.isProcessing}
                      >
                        {process.isSettingDefault ? (
                          <SmallSpinner />
                        ) : (
                          "Set as default"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modals */}
          <ConfirmSubmitModal
            show={modal.addressIdToDelete !== undefined}
            onHide={closeModal}
            onSubmit={handleDeleteAddress}
            custom={{
              action: "delete",
              title: "Delete Address",
              body: "Are you sure you want to delete this address? This action cannot be undone.",
              cancelText: "Cancel",
              submitText: "Delete",
            }}
          />

          <CreateAddressModal
            isFirstAddress={addresses.total === 0}
            show={modal.create}
            onHide={closeModal}
          />

          <UpdateAddressModal
            isOnlyOneAddress={addresses.total === 1}
            addressId={modal.addressIdToUpdate}
            onHide={closeModal}
          />
        </>
      )}
    </>
  );
}
