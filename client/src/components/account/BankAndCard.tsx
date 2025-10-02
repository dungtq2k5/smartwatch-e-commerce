import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faBank,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import {
  faCcVisa,
  faCcMastercard,
  faCcDiscover,
  faCcJcb,
  faCcAmex,
} from "@fortawesome/free-brands-svg-icons";
import { useUserPaymentMethodStore } from "../../store/userPaymentMethodStore";
import { formatError } from "../../../../common/utils.common";
import ApiError from "../ApiError";
import Loading from "../Loading";
import { useNavigate } from "react-router-dom";
import ConfirmSubmitModal from "../modal/ConfirmSubmitModal";
import { WAITING_EMOJI } from "../../configs";
import toast from "react-hot-toast";
import SmallSpinner from "../SmallSpinner";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isSettingDefault: boolean;
  isDeleting: boolean;
};

const cardBrandIcons: { [key: string]: JSX.Element } = {
  visa: (
    <FontAwesomeIcon
      icon={faCcVisa}
      size="2x"
      className="text-primary-emphasis"
    />
  ),
  mastercard: (
    <FontAwesomeIcon icon={faCcMastercard} size="2x" className="text-danger" />
  ),
  discover: (
    <FontAwesomeIcon icon={faCcDiscover} size="2x" className="text-warning" />
  ),
  jcb: (
    <FontAwesomeIcon
      icon={faCcJcb}
      size="2x"
      className="text-primary-emphasis"
    />
  ),
  amex: <FontAwesomeIcon icon={faCcAmex} size="2x" className="text-info" />,
};

export default function BankAndCard() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("BankAndCard render count:", renderCount.current);

  const navigate = useNavigate();

  const {
    paymentMethods,
    fetchPaymentMethods,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  } = useUserPaymentMethodStore();

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isSettingDefault: false,
    isDeleting: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [methodIdToDelete, setMethodIdToDelete] = useState<string | null>(null);

  useEffect((): void => {
    const handleFetchPaymentMethods = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isFetching: true,
      }));
      setApiErr(null);

      try {
        await fetchPaymentMethods();
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

    handleFetchPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/payment/create");
  }, [navigate, process.isProcessing]);

  const handleDelete = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!methodIdToDelete) {
      toast.error("Payment method id to delete not found.");
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isDeleting: true,
    }));
    try {
      await deletePaymentMethod(methodIdToDelete);
      toast.success("Payment method deleted successfully.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isDeleting: false,
      }));
    }
  }, [deletePaymentMethod, methodIdToDelete, process.isProcessing]);

  const handleSetDefault = useCallback(
    async (methodId: string): Promise<void> => {
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
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
        await setDefaultPaymentMethod(methodId);
        toast.success("Default payment method updated successfully.");
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
    [process.isProcessing, setDefaultPaymentMethod]
  );

  return (
    <>
      {process.isFetching ? (
        <Loading loadingMsg="Hang on we are loading payment methods..." />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !paymentMethods ? (
        <ApiError errMsg="Payment methods data not found." />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 card-title">My Banks & Cards</h1>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={process.isProcessing}
            >
              <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
              Add new payment method
            </button>
          </div>

          {paymentMethods.total === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted">
                You have not added any payment methods yet.
              </p>
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={handleCreate}
                disabled={process.isProcessing}
              >
                Add new payment method
              </button>
            </div>
          ) : (
            <div className="list-group">
              {paymentMethods.methods.map((method) => (
                <div
                  key={method.id}
                  className="list-group-item d-flex justify-content-between align-items-center p-3"
                >
                  <div className="d-flex align-items-center gap-3">
                    {method.type === "card" ? (
                      cardBrandIcons[method.card.brand.toLowerCase()] || (
                        <FontAwesomeIcon icon={faCreditCard} size="2x" />
                      )
                    ) : (
                      <FontAwesomeIcon icon={faBank} size="2x" />
                    )}
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h2 className="mb-0 fs-5 fw-bold text-capitalize">
                          {method.card.brand}{" "}
                          <span className="text-muted fw-normal">
                            •••• {method.card.last4}
                          </span>
                        </h2>
                        {method.isDefault && (
                          <span className="badge text-bg-primary">Default</span>
                        )}
                      </div>
                      {method.type === "card" && (
                        <p className="mb-0 text-muted small">
                          Expires{" "}
                          {String(method.card.expMonth).padStart(2, "0")}/
                          {method.card.expYear}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ms-3 text-end d-flex flex-column gap-1 align-items-end">
                    {paymentMethods.total > 1 && !method.isDefault && (
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0"
                        onClick={() => setMethodIdToDelete(method.id)}
                        disabled={process.isProcessing}
                      >
                        Delete
                      </button>
                    )}
                    {!method.isDefault && (
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => handleSetDefault(method.id)}
                        disabled={process.isProcessing}
                      >
                        {process.isSettingDefault ? (
                          <SmallSpinner />
                        ) : (
                          "Set as Default"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ConfirmSubmitModal
            show={!!methodIdToDelete}
            onHide={() => setMethodIdToDelete(null)}
            onSubmit={handleDelete}
            custom={{
              action: "delete",
              title: "Delete Payment Method",
              body: "Are you sure you want to delete this payment method? This action cannot be undone.",
              cancelText: "Cancel",
              submitText: "Delete",
            }}
          />
        </>
      )}
    </>
  );
}
