import { faArrowLeft, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  capFirstLetter,
  centsToUSD,
  formatError,
} from "../../../common/utils.common";
import type {
  OrderReturnDetailResponse,
  ReturnStateListResponse,
} from "../../../common/types.common";
import ApiError from "../components/ApiError";
import { useReturnStore } from "../store/returnRefund/returnStore";
import { useReturnStateStore } from "../store/returnRefund/returnStateStore";
import {
  RETURN_STATE_LEVEL_ICON_LEGEND,
  RETURN_STATE_LEVEL_MSG_LEGEND,
  WAITING_EMOJI,
} from "../configs";
import ReturnItem from "../components/purchase/ReturnItem";
import HowToPackModal from "../components/modal/HowToPackModal";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ReturnLabelHtml from "../components/pdf/ReturnLabelHtml";
import ConfirmSubmitModal from "../components/modal/ConfirmSubmitModal";
import PurchaseDetailSkeleton from "../components/skeleton/PurchaseDetailSkeleton";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isCanceling: boolean;
  isGeneratingPdf: boolean;
};

type Modal = {
  showHowToPack: boolean;
  cancelReturn: boolean;
};

export default function ReturnRefundDetail() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("ReturnRefundDetail render count:", renderCount.current);

  const navigate = useNavigate();

  const { id: orderId, returnId } = useParams();
  const {
    fetchReturnDetail,
    // isLoading: isCancelingReturn,
    updateReturn,
  } = useReturnStore();
  const {
    // isFetching: isFetchingReturnStates,
    // fetchErr: fetchReturnStatesErr,
    returnStates,
    fetchReturnStates,
    getReturnStateByLookupIdSync,
  } = useReturnStateStore();

  const [returnDetail, setReturnDetail] = useState<
    OrderReturnDetailResponse | undefined
  >(undefined);
  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isCanceling: false,
    isGeneratingPdf: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    showHowToPack: false,
    cancelReturn: false,
  });

  const labelRef = useRef<HTMLDivElement>(null);

  const currStatus = returnDetail?.states.at(-1);
  const currStatusLevel = currStatus?.level || 0;
  const isCancelled = currStatus?.lookupId === "7"; // cancelled
  const canUpdate = currStatus?.lookupId === "1"; // pending approval

  // Fetch initial when first loaded: return detail, return states
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!orderId) throw new Error("Order ID is not provided.");
        if (!returnId) throw new Error("Order return ID is not provided.");

        const [, fetchedReturnDetail] = await Promise.all([
          fetchReturnStates(),
          fetchReturnDetail(orderId, returnId),
        ]);

        setReturnDetail(fetchedReturnDetail);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isInitializing: false,
        }));
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, returnId]);

  const genProgressBar = useCallback(
    (
      states: ReturnStateListResponse["states"],
      returnDetailStates: OrderReturnDetailResponse["states"]
    ) => {
      return (
        <div className="row justify-content-center mb-4">
          {states.map((state, idx) => {
            if (["7", "8"].includes(state.lookupId)) return null; // Exclude cancelled/declined from progress bar
            const stepLevel = idx + 1;
            const isCompleted = currStatusLevel >= stepLevel;
            const isActive = currStatusLevel === stepLevel;
            const createdAt = returnDetailStates.find(
              (s) => s.id === state.id
            )?.createdAt;

            return (
              <div
                key={state.id}
                className={`col text-center progress-step ${
                  isCompleted ? "completed" : ""
                } ${isActive ? "active" : ""}`}
              >
                <div className="progress-step-icon">
                  <FontAwesomeIcon
                    icon={
                      RETURN_STATE_LEVEL_ICON_LEGEND[
                        state.level as keyof typeof RETURN_STATE_LEVEL_ICON_LEGEND
                      ] || faQuestion
                    }
                  />
                </div>
                <p className="mt-2 mb-0">{capFirstLetter(state.name)}</p>
                {createdAt && (
                  <p className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {new Date(createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [currStatusLevel]
  );

  const handleDownloadLabel = useCallback(async (): Promise<void> => {
    if (!labelRef.current) {
      toast.error("Label template not found.");
      return;
    }
    if (!returnDetail) {
      toast.error("Return detail not found.");
      return;
    }
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isGeneratingPdf: true,
    }));
    try {
      const canvas = await html2canvas(labelRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      // A6 page size in mm is 105 x 148
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a6",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`return-label-${returnDetail.id}.pdf`);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isGeneratingPdf: false,
      }));
    }
  }, [process.isProcessing, returnDetail]);

  const handleCancelReturn = useCallback(async (): Promise<void> => {
    if (!returnDetail) {
      toast.error("Return detail not found.");
      return;
    }
    if (!canUpdate) {
      toast.error("Return cannot be cancelled at this stage.");
      return;
    }
    if (process.isProcessing) {
      toast("Another cancel request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({ ...prev, isProcessing: true, isCanceling: true }));
    try {
      const cancelState = getReturnStateByLookupIdSync("7"); // cancelled
      if (!cancelState) throw new Error("Return state not found.");

      const { orderId, id: returnId } = returnDetail;
      await updateReturn(orderId, returnId, {
        stateId: cancelState.id,
      });
      const updatedReturnDetail = await fetchReturnDetail(orderId, returnId);

      setReturnDetail(updatedReturnDetail);
      toast.success("Return request has been cancelled.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCanceling: false,
      }));
    }
  }, [
    canUpdate,
    fetchReturnDetail,
    getReturnStateByLookupIdSync,
    process.isProcessing,
    returnDetail,
    updateReturn,
  ]);

  const closeModal = useCallback(() => {
    setModal({
      showHowToPack: false,
      cancelReturn: false,
    });
  }, []);

  return (
    <>
      {process.isInitializing ? (
        <PurchaseDetailSkeleton />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !returnStates ? (
        <ApiError errMsg="Return states data is not available." />
      ) : !returnDetail ? (
        <ApiError errMsg="Return detail data is not available." />
      ) : (
        <>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-dark"
              onClick={() => navigate(-1)}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
              Back to Purchases
            </button>
            <div className="text-end d-flex align-items-center gap-2">
              <p className="mb-0 text-muted">Return ID: {returnDetail.id}</p>
              <p className="mb-0">|</p>
              <p className="mb-0 text-primary text-uppercase">
                {currStatus?.name || "N/A"}
              </p>
            </div>
          </div>

          {/* Return Info */}
          <div className="border-bottom pb-4 mb-4">
            <h2 className="fs-4 mb-4">Return Information</h2>
            {/* Progress bar */}
            {
              // If return is cancelled/declined, display states from returnDetail only, else display all states
              genProgressBar(
                returnDetail.states.some((s) => ["7", "8"].includes(s.lookupId))
                  ? returnDetail.states
                  : returnStates.states,
                returnDetail.states
              )
            }

            {!isCancelled ? (
              <>
                <div className="d-flex gap-3">
                  {/* Pickup Address */}
                  <div className="bg-light p-3 rounded w-100">
                    <div className="mb-3">
                      <h3 className="fs-5 fw-semibold">Pickup Address</h3>
                      <p className="text-success mb-0">
                        Parcel will be collected from this address
                      </p>
                    </div>
                    <div>
                      <p className="fw-bold mb-1">
                        {returnDetail.pickupAddress.name}
                      </p>
                      <p className="text-muted mb-1">
                        {returnDetail.pickupAddress.phoneNumber}
                      </p>
                      <p className="text-muted mb-0">
                        {returnDetail.pickupAddress.fullAddress}
                      </p>
                    </div>
                  </div>
                  {/* Pickup History */}
                  <div className="bg-light p-3 rounded w-100">
                    <div className="mb-3">
                      <h3 className="fs-5 fw-semibold">Pickup History</h3>
                      <p className="text-success mb-0">
                        Estimated pickup date:{" "}
                        {new Date(
                          returnDetail.estimatePickupDate
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <ul className="list-unstyled order-history-timeline">
                      {returnDetail.pickupStates.map((state, idx) => (
                        <li
                          key={state.id}
                          className={`mb-3 timeline-item ${
                            idx === returnDetail.pickupStates.length - 1
                              ? "text-success-emphasis"
                              : ""
                          }`}
                        >
                          <p className="mb-0">
                            <span className="fw-bold">
                              {state.name.toLocaleUpperCase()}
                            </span>{" "}
                            - {new Date(state.createdAt).toLocaleString()}
                          </p>
                          {state.notes && (
                            <p className="text-muted small mb-0">
                              {state.notes}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {/* Message and utils button */}
                <div className="mt-3 d-flex justify-content-between align-items-end">
                  <p className="mb-0">
                    {
                      RETURN_STATE_LEVEL_MSG_LEGEND[
                        currStatusLevel as keyof typeof RETURN_STATE_LEVEL_MSG_LEGEND
                      ]
                    }
                  </p>
                  <div className="d-flex gap-3 flex-column">
                    {canUpdate && (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() =>
                            setModal({ ...modal, cancelReturn: true })
                          }
                          disabled={process.isProcessing}
                        >
                          Cancel Request
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() =>
                            navigate(
                              `/return-refund/update/${returnDetail.orderId}/${returnDetail.id}`
                            )
                          }
                        >
                          Edit Request
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted fst-italic mb-0">
                This return request has been cancelled.
              </p>
            )}
          </div>

          {/* Pickup Instruction */}
          {!isCancelled && (
            <div className="border-bottom pb-4 mb-4">
              <h2 className="fs-4 mb-3">Pickup Instruction</h2>
              <ul className="list-unstyled order-history-timeline pickup-instruction-timeline ms-3 mb-0">
                <li className="timeline-item mb-4" data-step="1">
                  <h3 className="h6 fw-semibold">Print Return Label</h3>
                  <p className="text-muted mb-2">
                    Your return label is available now for downloading.
                  </p>
                  <button
                    type="button"
                    className="btn btn-link p-0 me-2"
                    onClick={handleDownloadLabel}
                    disabled={process.isProcessing}
                  >
                    {process.isGeneratingPdf
                      ? "Downloading..."
                      : "Download label"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => setModal({ ...modal, showHowToPack: true })}
                  >
                    How to pack?
                  </button>
                </li>
                <li className="timeline-item mb-4" data-step="2">
                  <h3 className="h6 fw-semibold">Attach Label</h3>
                  <p className="text-muted mb-2">
                    Securely attach the label to the package by using this ID if{" "}
                    <span className="fw-semibold">you can't print it</span>.
                  </p>
                  <div
                    className="input-group input-group-sm"
                    style={{ maxWidth: "300px" }}
                  >
                    <input
                      type="text"
                      className="form-control"
                      value={returnDetail.id}
                      readOnly
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(returnDetail.id);
                        toast.success("Return ID copied to clipboard");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </li>
                <li className="timeline-item" data-step="3">
                  <h3 className="h6 fw-semibold">Wait for Pick Up</h3>
                  <p className="text-muted mb-0">
                    We will call you via your provided phone number, so please
                    pay attention to your phone.
                  </p>
                </li>
              </ul>
            </div>
          )}

          {/* Items and Summary */}
          <div className="border-bottom pb-4 mb-4">
            <h2 className="fs-4 mb-3">Returned Items</h2>
            <div className="row">
              {/* Items list */}
              <div className="col-lg-8">
                {returnDetail.items.map((item, idx) => (
                  <div
                    key={item.variation.id}
                    className={`pb-3 ${
                      idx < returnDetail.items.length - 1
                        ? "mb-3 border-bottom"
                        : ""
                    }`}
                  >
                    <ReturnItem item={item} />
                  </div>
                ))}
              </div>
              {/* Refund Summary */}
              <div className="col-lg-4">
                <div className="card border-0 bg-light">
                  <div className="card-body">
                    <h3 className="fs-5 fw-semibold mb-3">Refund Summary</h3>
                    {returnDetail.refundSummary.toCardCents > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>Refund to Card:</span>
                        <span>
                          {centsToUSD(returnDetail.refundSummary.toCardCents)}
                        </span>
                      </div>
                    )}
                    {returnDetail.refundSummary.toBalanceCents > 0 && (
                      <div className="d-flex justify-content-between mb-2">
                        <span>Refund to Balance:</span>
                        <span>
                          {centsToUSD(
                            returnDetail.refundSummary.toBalanceCents
                          )}
                        </span>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                      <span>Total Refund:</span>
                      <span>
                        {centsToUSD(
                          returnDetail.refundSummary.finalRefundAmountCents
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Return reason */}
          <div>
            <h2 className="fs-4 mb-3">Return Reason</h2>
            <p className="mb-1">
              Reason: {capFirstLetter(returnDetail.reason.name)}
            </p>
            {returnDetail.buyerReason && (
              <p className="text-muted fst-italic">
                Buyer reason: "{returnDetail.buyerReason}"
              </p>
            )}
            {returnDetail.imageUrls.length > 0 && (
              <>
                <h3 className="fs-5 fw-semibold mt-3 mb-2">Attached Images</h3>
                <div className="d-flex flex-wrap gap-2">
                  {returnDetail.imageUrls.map((url, idx) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={url}
                        alt={`Return attachment ${idx + 1}`}
                        className="purchase-item-img--g rounded"
                      />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          {!isCancelled && (
            <>
              {/* Modals */}
              <HowToPackModal show={modal.showHowToPack} onHide={closeModal} />
              <ConfirmSubmitModal
                show={modal.cancelReturn}
                onHide={closeModal}
                onSubmit={handleCancelReturn}
                custom={{
                  action: "delete",
                  title: "Are you sure you want to cancel this return request?",
                  body: "This action cannot be undone.",
                  cancelText: "Go back",
                  submitText: "Cancel return",
                }}
              />

              {/* Off-screen label for PDF generation */}
              <ReturnLabelHtml ref={labelRef} returnDetail={returnDetail} />
            </>
          )}
        </>
      )}
    </>
  );
}
