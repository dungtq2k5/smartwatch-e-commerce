import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useUserAddressStore } from "../../store/addressStore";
import Loading from "../Loading";
import ApiError from "../ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import CreateAddressModal from "./CreateAddressModal";
import UpdateAddressModal from "./UpdateAddressModal";

type ModalState = {
  selectAddress: boolean;
  createAddress: boolean;
  addressIdToEdit?: string;
};

const SelectAddressModal = memo(
  ({
    currentAddressId, // For default address selection
    show,
    onHide,
    onSelect,
  }: Readonly<{
    currentAddressId?: string;
    show: boolean;
    onHide: () => void;
    onSelect: (addressId: string) => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("SelectAddressModal render count:", renderCount.current);

    const { isFetching, fetchErr, addresses, fetchAddresses } =
      useUserAddressStore();

    const [selectedAddressId, setSelectedAddressId] =
      useState(currentAddressId);
    const [modalState, setModalState] = useState<ModalState>({
      selectAddress: show,
      createAddress: false,
      addressIdToEdit: undefined,
    });

    // Fetch on initial loaded: addresses
    useEffect(() => {
      const handleFetchAddresses = async (): Promise<void> => {
        if (!addresses) await fetchAddresses();
      };

      handleFetchAddresses();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset selected address when modal is closed or currentAddressId changes
    useEffect(() => {
      setModalState((prev) => ({
        ...prev,
        selectAddress: show,
      }));

      if (!show) {
        setTimeout(() => {
          setSelectedAddressId(currentAddressId);
        }, 200); // Delay to ensure modal closes before resetting
      }
    }, [currentAddressId, show]);

    const handleSubmit = useCallback(
      (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        if (selectedAddressId) {
          onSelect(selectedAddressId);
          onHide();
        }
      },
      [onHide, onSelect, selectedAddressId]
    );

    const closeSubModal = useCallback((): void => {
      setModalState({
        selectAddress: true,
        createAddress: false,
        addressIdToEdit: undefined,
      });
    }, []);

    return (
      <>
        <Modal show={modalState.selectAddress} onHide={onHide} centered>
          <Modal.Header closeButton>
            <Modal.Title>Select Address</Modal.Title>
          </Modal.Header>

          <form onSubmit={handleSubmit}>
            <Modal.Body>
              {isFetching ? (
                <Loading loadingMsg="Loading addresses..." />
              ) : fetchErr ? (
                <ApiError errMsg={fetchErr} />
              ) : !addresses ? (
                <ApiError errMsg="Addresses data not available." />
              ) : !addresses.total ? (
                <p>No addresses found!</p>
              ) : (
                <>
                  <div className="d-flex flex-column gap-3">
                    {addresses.addresses.map((addr) => {
                      const htmlFor = `addr-${addr.id}`;
                      return (
                        <div className="form-check" key={addr.id}>
                          <input
                            className="form-check-input"
                            type="radio"
                            name="address-select"
                            id={htmlFor}
                            value={addr.id}
                            checked={selectedAddressId === addr.id}
                            onChange={(e) =>
                              setSelectedAddressId(e.target.value)
                            }
                          />
                          <label
                            className="form-check-label w-100 address-select-label--g"
                            htmlFor={htmlFor}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <p className="fw-bold mb-1">
                                {addr.name} | {addr.phoneNumber}
                              </p>
                              <button
                                type="button"
                                className="btn btn-link p-0 btn-sm"
                                onClick={() =>
                                  setModalState({
                                    selectAddress: false,
                                    createAddress: false,
                                    addressIdToEdit: addr.id,
                                  })
                                }
                              >
                                Edit
                              </button>
                            </div>
                            <p className="text-muted mb-1">
                              {addr.fullAddress}
                            </p>
                            {addr.isDefault && (
                              <span className="badge bg-primary">Default</span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  <hr />
                  <button
                    type="button"
                    className="btn btn-outline-primary w-100"
                    onClick={() =>
                      setModalState({
                        selectAddress: false,
                        createAddress: true,
                        addressIdToEdit: undefined,
                      })
                    }
                  >
                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                    Add New Address
                  </button>
                </>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button type="button" variant="secondary" onClick={onHide}>
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  !selectedAddressId || selectedAddressId === currentAddressId
                }
              >
                Select Address
              </Button>
            </Modal.Footer>
          </form>
        </Modal>

        <CreateAddressModal
          isFirstAddress={!addresses || addresses.total === 0}
          show={modalState.createAddress}
          onHide={closeSubModal}
          onSuccess={setSelectedAddressId}
        />

        <UpdateAddressModal
          isOnlyOneAddress={!addresses || addresses.total === 1}
          addressId={modalState.addressIdToEdit}
          onHide={closeSubModal}
          onSuccess={setSelectedAddressId}
        />
      </>
    );
  }
);

export default SelectAddressModal;
