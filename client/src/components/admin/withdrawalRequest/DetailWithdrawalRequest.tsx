import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import useWithdrawalRequestStore from "../../../store/admin/withdrawalRequestStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useWithdrawalStateStore from "../../../store/common/withdrawalStateStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { AdminWithdrawalRequestResponse } from "../../../../../common/types.common";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faUser, faXmark } from "@fortawesome/free-solid-svg-icons";
import EditWithdrawalRequestStateModal from "./EditWithdrawalRequestModal";
import WithdrawalRequestStateBadge from "../WithdrawalRequestStateBadge";
import WithdrawalMethodBadge from "../WithdrawalMethodBadge";
import DetailWithdrawalRequestSkeleton from "../skeleton/DetailWithdrawalRequestSkeleton";

type Modal = {
  requestIdToApprove: string | null;
  requestIdToReject: string | null;
};

const DEFAULT_MODAL_STATE: Modal = {
  requestIdToApprove: null,
  requestIdToReject: null,
};

export default function DetailWithdrawalRequest() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailWithdrawalRequest render count:", renderCount.current);

  const { id } = useParams();

  const { fetchWithdrawalRequest, canApproveRequest, canRejectRequest } =
    useWithdrawalRequestStore();
  const { withdrawalStates, fetchWithdrawalStates, getWithdrawalState } =
    useWithdrawalStateStore();
  const { signals, refresh } = useRefreshStore();

  const [canEditRequest, canReadUser] = [
    useHasPermission("u_withdrawal_req"),
    useHasPermission("r_usr"),
  ];

  // Since normal withdrawal request data is enough not need for a details version
  const [request, setRequest] = useState<AdminWithdrawalRequestResponse | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>(DEFAULT_MODAL_STATE);

  // Fetch and set initial data
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Request ID is missing.");

        const [fetchedRequest] = await Promise.all([
          fetchWithdrawalRequest(id),
          withdrawalStates ? Promise.resolve() : fetchWithdrawalStates(),
        ]);

        setRequest(fetchedRequest);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setIsInitializing(false);
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signals.admin]);

  const closeModal = useCallback((): void => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const onSuccessUpdate = useCallback((): void => {
    refresh("admin");
    closeModal();
  }, [refresh, closeModal]);

  // Since this is a detail page which is only render 1 time so don't need to worry about re-render problems
  const latestRequestState = getWithdrawalState(
    request?.states.at(-1)?.id || "",
  );
  const canApprove =
    canEditRequest &&
    latestRequestState &&
    canApproveRequest(latestRequestState.lookupId);
  const canReject =
    canEditRequest &&
    latestRequestState &&
    canRejectRequest(latestRequestState.lookupId);

  return (
    <>
      {isInitializing ? (
        <DetailWithdrawalRequestSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !request ? (
        <ApiError errorMessage="Request details not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Withdrawal Request Details #${request.id}`}
            parentTitle="Withdrawal Requests Management"
            parentLink="/admin/withdrawal-requests"
            className="mb-4"
          />

          {/* Main Content */}
          <div className="row g-4">
            {/* Left Column: Withdrawal Info & Bank Account */}
            <div className="col-12 col-xl-4 col-md-5">
              {/* Withdrawal Information Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">
                    Withdrawal Information
                  </h2>
                </div>
                <div className="card-body">
                  {/* Current state badge */}
                  <div className="mb-3 d-flex flex-wrap gap-2">
                    <WithdrawalRequestStateBadge state={latestRequestState} />
                  </div>

                  <hr className="text-muted opacity-25" />

                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Request ID
                      </span>
                      <div className="small font-monospace text-break">
                        {request.id}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Requested By
                      </span>
                      <div>
                        <DetailUserLink
                          userId={request.requestedBy.id}
                          disabled={!canReadUser}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                        >
                          {request.requestedBy.fullName}
                        </DetailUserLink>
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Withdrawal Method
                      </span>
                      <div>
                        <WithdrawalMethodBadge
                          method={request.withdrawalMethod}
                        />
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Amount
                      </span>
                      <div className="small fw-bold text-success">
                        {centsToUSD(request.amountCents)}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Currency
                      </span>
                      <div className="small">{request.currency}</div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Requested Date
                      </span>
                      <div className="small">
                        {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {request.processedAt && (
                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Processed Date
                        </span>
                        <div className="small">
                          {new Date(request.processedAt).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {request.failureReason && (
                      <div className="col-12 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Failure Reason
                        </span>
                        <div className="small text-danger">
                          {request.failureReason}
                        </div>
                      </div>
                    )}

                    <div className="col-12 border-top pt-3">
                      <span className="small text-uppercase fw-bold text-muted d-block mb-2">
                        Stripe Transfer Details
                      </span>
                    </div>

                    {request.stripeTransferId && (
                      <div className="col-12 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Stripe Transfer ID
                        </span>
                        <div className="small font-monospace text-break">
                          {request.stripeTransferId}
                        </div>
                      </div>
                    )}

                    {request.stripeTransferGroupId && (
                      <div className="col-12 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Stripe Transfer Group ID
                        </span>
                        <div className="small font-monospace text-break">
                          {request.stripeTransferGroupId}
                        </div>
                      </div>
                    )}

                    <div className="col-12">
                      <span className="small text-uppercase fw-bold text-muted">
                        Last Updated
                      </span>
                      <div className="small">
                        {new Date(request.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Account Card */}
              {request.bankAccount && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white py-3">
                    <h2 className="fs-5 card-title mb-0">Bank Account</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-12 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Account Holder Name
                        </span>
                        <div className="small fw-semibold">
                          {request.bankAccount.accountHolderName}
                        </div>
                      </div>

                      <div className="col-12 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Bank Name
                        </span>
                        <div className="small">
                          {request.bankAccount.bankName}
                        </div>
                      </div>

                      <div className="col-12 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Account Last 4 Digits
                        </span>
                        <div className="small font-monospace">
                          ****{request.bankAccount.last4}
                        </div>
                      </div>

                      <div className="col-12">
                        <span className="small text-uppercase fw-bold text-muted">
                          Stripe Account ID
                        </span>
                        <div className="small font-monospace text-break text-muted">
                          {request.bankAccount.stripeConnectedAccountId}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: State History */}
            <div className="col-12 col-xl-8 col-md-7">
              {/* Withdrawal State History */}
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">
                    Withdrawal State History
                  </h2>
                </div>
                <div className="card-body">
                  {canEditRequest && (
                    <div className="d-flex justify-content-end gap-2 mb-3">
                      {canApprove && (
                        <button
                          type="button"
                          className="btn text-success"
                          title="Approve this withdrawal request"
                          onClick={() =>
                            setModal((prev) => ({
                              ...prev,
                              requestIdToApprove: request.id,
                            }))
                          }
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                      )}
                      {canReject && (
                        <button
                          type="button"
                          className="btn text-danger"
                          title="Reject this withdrawal request"
                          onClick={() =>
                            setModal((prev) => ({
                              ...prev,
                              requestIdToReject: request.id,
                            }))
                          }
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="order-history-timeline newest-first mt-2">
                    {[...request.states].reverse().map((state, idx) => {
                      const isLatest = idx === 0;
                      const stateData = getWithdrawalState(state.id);

                      return (
                        <div key={state.id} className="timeline-item pb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <WithdrawalRequestStateBadge state={stateData} />
                              {isLatest && (
                                <span className="badge bg-primary bg-opacity-75">
                                  Current
                                </span>
                              )}
                            </div>
                            <small className="text-muted">
                              {new Date(state.createdAt).toLocaleString()}
                            </small>
                          </div>
                          <div className="card border p-3 rounded-3 shadow-none">
                            <div className="small">
                              {state.createdBy && (
                                <div className="mb-2 text-muted">
                                  <FontAwesomeIcon
                                    icon={faUser}
                                    size="xs"
                                    className="me-1 opacity-50"
                                  />
                                  <DetailUserLink
                                    userId={state.createdBy}
                                    disabled={!canReadUser}
                                    disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                                  >
                                    {state.createdBy}
                                  </DetailUserLink>
                                </div>
                              )}
                              {state.notes ? (
                                <span className="text-muted fst-italic">
                                  Note: "{state.notes}"
                                </span>
                              ) : (
                                <span className="text-muted fst-italic">
                                  No notes.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
          <EditWithdrawalRequestStateModal
            type="approve"
            requestId={modal.requestIdToApprove}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />

          <EditWithdrawalRequestStateModal
            type="reject"
            requestId={modal.requestIdToReject}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />
        </>
      )}
    </>
  );
}
