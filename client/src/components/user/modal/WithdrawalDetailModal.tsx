import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import { useWithdrawalStateStore } from "../../../store/common/withdrawalStateStore";
import type {
  SelfWithdrawalRequestResponse,
  WithdrawalStateResponse,
} from "../../../../../common/types.common";
import { useUserWithdrawalRequestStore } from "../../../store/user/userWithdrawalRequestStore";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBank, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { WITHDRAWAL_STATE_LOOKUPID_MSG_LEGEND } from "../../../configs";
import ConfirmSubmitModal from "./ConfirmSubmitModal";
import toast from "react-hot-toast";

type Modal = {
  withdrawalDetailModal: boolean;
  cancelWithdrawalModal: boolean;
};

const WithdrawalDetailModal = memo(
  ({
    requestId,
    onHide,
  }: Readonly<{
    requestId?: string | null; // if not provided -> close modal
    onHide: () => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current++;
    console.log(`Rendering WithdrawalDetailModal: ${renderCount.current}`);

    const { getWithdrawalRequest, cancelWithdrawalRequest, canCancelRequest } =
      useUserWithdrawalRequestStore();
    const { getWithdrawalState } = useWithdrawalStateStore();

    const [withdrawalRequest, setWithdrawalRequest] =
      useState<SelfWithdrawalRequestResponse | null>(null);
    const [requestState, setRequestState] =
      useState<WithdrawalStateResponse | null>(null);

    const [isInitializing, setIsInitializing] = useState<boolean>(false);
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [modal, setModal] = useState<Modal>({
      withdrawalDetailModal: !!requestId,
      cancelWithdrawalModal: false,
    });

    // Fetch and set on initial load: withdrawalRequest, requestState
    useEffect(() => {
      setModal((prev) => ({
        ...prev,
        withdrawalDetailModal: !!requestId,
      }));

      if (requestId) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setIsInitializing(true);
          setApiErr(null);

          try {
            const withdrawalRequest = await getWithdrawalRequest(requestId);
            setWithdrawalRequest(withdrawalRequest);

            const latestState = withdrawalRequest.states.at(-1);
            if (latestState) {
              const requestState = await getWithdrawalState(latestState.id);
              setRequestState(requestState);
            }
          } catch (error) {
            setApiErr(formatError(error));
          } finally {
            setIsInitializing(false);
          }
        };

        handleFetchSetInitialData();
        return;
      }

      setTimeout(() => {
        setWithdrawalRequest(null);
        setRequestState(null);
        setApiErr(null);
      }, 200); // small delay to avoid flickering

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId]);

    const canCancel = useMemo(() => {
      if (!requestState) return false;
      return canCancelRequest(requestState.lookupId);
    }, [canCancelRequest, requestState]);

    const handleSubmitCancelRequest = useCallback(async (): Promise<void> => {
      try {
        if (!withdrawalRequest) {
          throw new Error("Withdrawal request is missing.");
        }
        if (!canCancel) {
          throw new Error("This withdrawal request cannot be cancelled.");
        }

        await cancelWithdrawalRequest(withdrawalRequest.id);
        toast.success("Withdrawal request has been cancelled.");
      } catch (error) {
        toast.error(formatError(error));
      }
    }, [canCancel, cancelWithdrawalRequest, withdrawalRequest]);

    const closeSubModal = useCallback((): void => {
      setModal({
        withdrawalDetailModal: true,
        cancelWithdrawalModal: false,
      });
    }, []);

    return (
      <>
        <Modal
          show={modal.withdrawalDetailModal}
          onHide={onHide}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Withdrawal Details</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {isInitializing ? (
              <Loading loadingMsg="Loading withdrawal details..." />
            ) : apiErr ? (
              <ApiError errMsg={apiErr} />
            ) : !withdrawalRequest ? (
              <ApiError errMsg="Withdrawal request data not found." />
            ) : !requestState ? (
              <ApiError errMsg="Withdrawal request state data not found." />
            ) : (
              <>
                {/* Header */}
                <div className="text-center border-bottom pb-3 mb-4">
                  <h1 className="display-6 fw-bold">
                    -{centsToUSD(withdrawalRequest.amountCents)}
                  </h1>
                  <p className="text-success mb-0 fs-5 text-capitalize">
                    Transaction {requestState.name}
                  </p>
                </div>

                {/* Main content */}
                <div className="row g-4">
                  {/* Left column: Info */}
                  <div className="col-md-6 d-flex flex-column gap-4">
                    <div>
                      <h2 className="fs-5 fw-semibold mb-2">Withdraw To</h2>
                      <div className="d-flex align-items-center gap-3 bg-light p-3 rounded">
                        <FontAwesomeIcon icon={faBank} size="2x" />
                        <div>
                          <p className="fw-bold mb-0 text-capitalize">
                            {withdrawalRequest.bankAccount.bankName}
                          </p>
                          <p className="text-muted mb-0">
                            **** {withdrawalRequest.bankAccount.last4}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-light p-3 rounded">
                      <h2 className="fs-5 fw-semibold mb-2">Summary</h2>
                      <div className="d-flex justify-content-between">
                        <p className="mb-0">Withdrawal Fee:</p>
                        <p className="mb-0">Free</p>
                      </div>
                      <div className="d-flex justify-content-between fw-bold fs-5">
                        <p className="mb-0">Final Amount:</p>
                        <p className="mb-0">
                          {centsToUSD(withdrawalRequest.amountCents)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-light p-3 rounded">
                      <h2 className="fs-5 fw-semibold mb-2">Details</h2>
                      <div className="d-flex justify-content-between">
                        <p className="mb-0 fw-semibold">Withdrawal ID:</p>
                        <p className="mb-0 text-muted text-break">
                          {withdrawalRequest.id}
                        </p>
                      </div>
                      <div className="d-flex justify-content-between">
                        <p className="mb-0 fw-semibold">Created At:</p>
                        <p className="mb-0 text-muted">
                          {new Date(
                            withdrawalRequest.createdAt
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="d-flex justify-content-between">
                        <p className="mb-0 fw-semibold">Completed At:</p>
                        <p className="mb-0 text-muted">
                          {requestState.level === 4 &&
                          withdrawalRequest.states.at(-1)?.createdAt
                            ? new Date(
                                withdrawalRequest.states.at(-1)!.createdAt
                              ).toLocaleString()
                            : "Pending"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right column: Progress */}
                  <div className="col-md-6">
                    <div className="bg-light p-3 rounded h-100">
                      <h2 className="fs-5 fw-semibold mb-2">
                        Withdrawal History
                      </h2>
                      <ul className="list-unstyled order-history-timeline">
                        {withdrawalRequest.states.map((state, idx) => {
                          const currentState =
                            withdrawalRequest.states.length - 1 === idx;
                          const stateInfo = withdrawalRequest.states.find(
                            (s) => s.id === state.id
                          );
                          const stateName =
                            (currentState && requestState?.name) ||
                            stateInfo?.notes?.split(" ")[0] ||
                            "Processing";

                          return (
                            <li
                              key={state.id}
                              className={`mb-3 timeline-item ${
                                currentState ? "text-success-emphasis" : ""
                              }`}
                            >
                              <p className="mb-0">
                                <span className="fw-bold text-capitalize">
                                  {stateName}
                                </span>{" "}
                                - {new Date(state.createdAt).toLocaleString()}
                              </p>
                              {state.notes && (
                                <p className="text-muted small mb-0">
                                  {state.notes}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Message & Buttons */}
                <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                  <p className="mb-0 text-muted fst-italic">
                    <FontAwesomeIcon
                      icon={faCircleExclamation}
                      className="me-2"
                    />
                    {WITHDRAWAL_STATE_LOOKUPID_MSG_LEGEND[
                      requestState.lookupId as keyof typeof WITHDRAWAL_STATE_LOOKUPID_MSG_LEGEND
                    ] || "No additional information available."}
                  </p>
                  {canCancel && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() =>
                        setModal({
                          withdrawalDetailModal: false,
                          cancelWithdrawalModal: true,
                        })
                      }
                    >
                      Cancel this Request
                    </button>
                  )}
                </div>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button type="button" variant="primary" onClick={onHide}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Cancel Confirmation Modal */}
        <ConfirmSubmitModal
          show={modal.cancelWithdrawalModal}
          onHide={closeSubModal}
          onSubmit={handleSubmitCancelRequest}
          custom={{
            action: "delete",
            title: "Cancel Withdrawal Request",
            body: "Are you sure you want to cancel this withdrawal request? This action cannot be undone.",
            cancelText: "No, Keep It",
            submitText: "Yes, Cancel It",
          }}
        />
      </>
    );
  }
);

export default WithdrawalDetailModal;
