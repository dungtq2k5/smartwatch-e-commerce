import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { AdminOrderReturnDetailsResponse } from "../../../../../common/types.common";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faMoneyBillTransfer,
  faTruck,
  faUser,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Accordion } from "react-bootstrap";
import OrderReturnStateBadge from "../OrderReturnStateBadge";
import OrderReturnPickupStateBadge from "../OrderReturnPickupStateBadge";
import OrderReturnRefundStateBadge from "../OrderReturnRefundStateBadge";
import defaultProductImg from "../../../assets/default-product.webp";
import SlashColor from "../../common/SlashColor";
import LinkBtn from "../../common/LinkBtn";
import MapLink from "../../common/MapLink";
import DetailOrderReturnSkeleton from "../skeleton/DetailOrderReturnSkeleton";
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";
import useRefundStateStore from "../../../store/common/returnRefund/refundStateStore";
import usePickupStateStore from "../../../store/common/returnRefund/pickupStateStore";
import { useReturnStore } from "../../../store/admin/orderReturn/orderReturnStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import EditOrderReturnStateModal from "./EditOrderReturnStateModal";
import EditOrderReturnPickupStateModal from "./EditOrderReturnPickupStateModal";

type Modal = {
  returnIdToApprove: string | null;
  returnIdToDecline: string | null;
  returnIdToRefund: string | null;
  returnIdToUpdatePickupState: string | null;
};

const DEFAULT_MODAL_STATE: Modal = {
  returnIdToApprove: null,
  returnIdToDecline: null,
  returnIdToRefund: null,
  returnIdToUpdatePickupState: null,
};

export default function DetailOrderReturn() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailOrderReturn render count:", renderCount.current);

  const { id } = useParams();

  const {
    fetchReturnDetails,
    canApproveReturn,
    canDeclineReturn,
    canRefundReturn,
    canUpdateReturnPickupState,
  } = useReturnStore();
  const { returnStates, fetchReturnStates, getReturnState } =
    useReturnStateStore();
  const { refundStates, fetchRefundStates, getRefundState } =
    useRefundStateStore();
  const { pickupStates, fetchPickupStates, getPickupState } =
    usePickupStateStore();
  const { signals, refresh } = useRefreshStore();

  const [
    canReadUser,
    canReadOrder,
    canEditReturn,
    canReadProduct,
    canReadInstance,
  ] = [
    useHasPermission("r_usr"),
    useHasPermission("r_order"),
    useHasPermission("u_order_return"),
    useHasPermission("r_product"),
    useHasPermission("r_variation_instance"),
  ];

  const [returnDetails, setReturnDetails] =
    useState<AdminOrderReturnDetailsResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>(DEFAULT_MODAL_STATE);

  // Fetch and set initial data
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Return ID is missing.");

        const [fetchedReturnDetails] = await Promise.all([
          fetchReturnDetails(id),
          refundStates ? Promise.resolve() : fetchRefundStates(),
          pickupStates ? Promise.resolve() : fetchPickupStates(),
          returnStates ? Promise.resolve() : fetchReturnStates(),
        ]);

        setReturnDetails(fetchedReturnDetails);
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
  // Get latest states for display in header
  const latestReturnState = getReturnState(
    returnDetails?.states.at(-1)?.id || "",
  );
  const latestRefundState = getRefundState(
    returnDetails?.refundStates.at(-1)?.id || "",
  );
  const latestPickupState = getPickupState(
    returnDetails?.pickupStates.at(-1)?.id || "",
  );

  // Determine which actions are available
  const canApprove =
    canEditReturn &&
    latestReturnState &&
    canApproveReturn(latestReturnState.lookupId);
  const canDecline =
    canEditReturn &&
    latestReturnState &&
    canDeclineReturn(latestReturnState.lookupId);
  const canRefund =
    canEditReturn &&
    latestReturnState &&
    canRefundReturn(latestReturnState.lookupId);
  const canUpdatePickupState =
    canEditReturn &&
    latestPickupState &&
    canUpdateReturnPickupState(latestPickupState.lookupId);

  return (
    <>
      {isInitializing ? (
        <DetailOrderReturnSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !returnDetails ? (
        <ApiError errorMessage="Return details not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Return Details #${returnDetails.id}`}
            parentTitle="Order Returns Management"
            parentLink="/admin/order-returns"
            className="mb-4"
          />

          <div className="row g-4">
            {/* Left Column: Return Info */}
            <div className="col-12 col-xl-4 col-md-5">
              {/* Return Information Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">Return Information</h2>
                </div>
                <div className="card-body">
                  {/* Current state badges */}
                  <div className="mb-3 d-flex flex-wrap gap-2">
                    <OrderReturnStateBadge state={latestReturnState} />
                    <OrderReturnRefundStateBadge state={latestRefundState} />
                    <OrderReturnPickupStateBadge state={latestPickupState} />
                  </div>

                  <hr className="text-muted opacity-25" />

                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Return ID
                      </span>
                      <div className="small font-monospace text-break">
                        {returnDetails.id}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Order ID
                      </span>
                      <div>
                        <LinkBtn
                          to={`/admin/orders/${returnDetails.orderId}`}
                          disabled={!canReadOrder}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                          className="small font-monospace"
                        >
                          {returnDetails.orderId}
                        </LinkBtn>
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Returned By
                      </span>
                      <div>
                        <DetailUserLink
                          userId={returnDetails.returnedBy.id}
                          disabled={!canReadUser}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                        >
                          {returnDetails.returnedBy.fullName}
                        </DetailUserLink>
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Return Requested
                      </span>
                      <div className="small">
                        {new Date(returnDetails.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Last Updated
                      </span>
                      <div className="small">
                        {new Date(returnDetails.updatedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Est. Pickup Date
                      </span>
                      <div className="small">
                        {returnDetails.estimatePickupDate
                          ? new Date(
                              returnDetails.estimatePickupDate,
                            ).toLocaleDateString()
                          : "Not set"}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Actual Pickup Date
                      </span>
                      <div className="small">
                        {returnDetails.pickupDate
                          ? new Date(returnDetails.pickupDate).toLocaleString()
                          : "Not yet picked up"}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Reason
                      </span>
                      <div className="small">
                        <strong>{returnDetails.reason.name}</strong>
                      </div>
                      {returnDetails.reason.description && (
                        <div className="small text-muted">
                          {returnDetails.reason.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {returnDetails.buyerReason && (
                    <div className="mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Buyer's Reason
                      </span>
                      <div className="small font-italic">
                        "{returnDetails.buyerReason}"
                      </div>
                    </div>
                  )}

                  <hr className="text-muted opacity-25" />

                  {/* Refund Summary */}
                  <div className="mb-0">
                    <span className="small text-uppercase fw-bold text-muted d-block mb-2">
                      Refund Summary
                    </span>
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="small">
                          <span className="text-muted d-block">To Card</span>
                          <span className="fw-bold text-primary">
                            {centsToUSD(
                              returnDetails.refundSummary.toCardCents,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="small">
                          <span className="text-muted d-block">To Balance</span>
                          <span className="fw-bold text-primary">
                            {centsToUSD(
                              returnDetails.refundSummary.toBalanceCents,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 border-top pt-2 mt-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small text-uppercase fw-bold text-muted">
                            Final Refund
                          </span>
                          <span className="fs-5 fw-bold text-success">
                            {centsToUSD(
                              returnDetails.refundSummary
                                .finalRefundAmountCents,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Evidence Images Card */}
              {returnDetails.imageUrls.length > 0 && (
                <div className="card shadow-sm border-0 mb-4">
                  <div className="card-header bg-white py-3">
                    <h2 className="fs-5 card-title mb-0">
                      Return Evidence Images
                    </h2>
                  </div>
                  <div className="card-body p-0">
                    <div
                      style={{
                        display: "flex",
                        overflowX: "auto",
                        gap: "12px",
                        padding: "16px",
                      }}
                    >
                      {returnDetails.imageUrls.map((imageUrl) => (
                        <img
                          key={imageUrl}
                          src={imageUrl}
                          alt="Return evidence"
                          className="rounded"
                          style={{
                            height: "180px",
                            minWidth: "180px",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pickup Address Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">Pickup Address</h2>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <p className="mb-1 fw-semibold">
                      {returnDetails.pickupAddress.name}
                    </p>
                    <p className="mb-1 small text-muted">
                      {returnDetails.pickupAddress.phoneNumber}
                    </p>
                  </div>

                  <div className="mb-3">
                    <p className="small text-muted mb-1">Full Address:</p>
                    <p className="small">
                      {returnDetails.pickupAddress.fullAddress}
                    </p>
                  </div>

                  <div className="text-end">
                    <MapLink
                      latitude={
                        returnDetails.pickupAddress.location.coordinates[1]
                      }
                      longitude={
                        returnDetails.pickupAddress.location.coordinates[0]
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Refund Transaction Card */}
              {returnDetails.refundTransaction && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white py-3">
                    <h2 className="fs-5 card-title mb-0">Refund Transaction</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Amount
                        </span>
                        <div className="small fw-bold text-success">
                          {centsToUSD(
                            returnDetails.refundTransaction.amountCents,
                          )}
                        </div>
                      </div>

                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Currency
                        </span>
                        <div className="small">
                          {returnDetails.refundTransaction.currency}
                        </div>
                      </div>

                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Transaction Date
                        </span>
                        <div className="small">
                          {new Date(
                            returnDetails.refundTransaction.transactionDate,
                          ).toLocaleString()}
                        </div>
                      </div>

                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Payment Intent ID
                        </span>
                        <div className="small font-monospace text-break">
                          {returnDetails.refundTransaction.paymentIntentId}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: State Timelines */}
            <div className="col-12 col-xl-8 col-md-7">
              {/* Return Items Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">
                    Return Items ({returnDetails.items.length})
                  </h2>
                </div>
                <div className="card-body">
                  {returnDetails.items.map((item, idx) => {
                    const isProductDeleted =
                      item.variation.productModel.product.isDeleted;
                    const isModelDeleted =
                      item.variation.productModel.isDeleted;
                    const isVariationDeleted = item.variation.isDeleted;
                    const isStopSelling =
                      item.variation.productModel.product.stopSelling ||
                      item.variation.productModel.stopSelling ||
                      item.variation.stopSelling;
                    const isFaded =
                      isProductDeleted || isModelDeleted || isVariationDeleted;

                    return (
                      <div
                        key={item.variation.id}
                        className={`d-flex gap-3 pb-3 ${
                          idx < returnDetails.items.length - 1
                            ? "mb-3 border-bottom"
                            : ""
                        } ${isFaded ? "opacity-75" : ""}`}
                      >
                        <img
                          src={item.variation.imageUrls[0] || defaultProductImg}
                          alt={item.variation.name}
                          className={`checkout-item-img--g rounded flex-shrink-0 ${isFaded ? "opacity-50" : ""}`}
                          loading="lazy"
                        />
                        <div className="flex-grow-1 min-w-0">
                          <div className="mb-1">
                            <LinkBtn
                              to={`/admin/products/${item.variation.productModel.product.id}`}
                              disabled={!canReadProduct || isProductDeleted}
                              disabledtitle={
                                isProductDeleted
                                  ? "Product has been deleted"
                                  : DISABLED_TITLE_FOR_VIEWING
                              }
                            >
                              {item.variation.productModel.product.name} -{" "}
                              {item.variation.productModel.name}
                            </LinkBtn>
                          </div>
                          <div className="d-flex align-items-center small text-muted mb-2">
                            <SlashColor
                              hexColor={item.variation.color.hex}
                              size="big"
                              className="me-1"
                            />
                            <span>
                              {item.variation.name} -{" "}
                              {item.variation.color.name}
                            </span>
                          </div>

                          {/* Warning badges for deleted / stop-selling */}
                          <div className="d-flex flex-wrap gap-1 mb-2">
                            {isProductDeleted && (
                              <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle">
                                Product Deleted
                              </span>
                            )}
                            {isModelDeleted && (
                              <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle">
                                Model Deleted
                              </span>
                            )}
                            {isVariationDeleted && (
                              <span className="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle">
                                Variation Deleted
                              </span>
                            )}
                            {isStopSelling && !isFaded && (
                              <span className="badge bg-warning bg-opacity-10 text-warning-emphasis border border-warning-subtle">
                                Stopped Selling
                              </span>
                            )}
                          </div>

                          {/* Instances */}
                          <div className="small">
                            <span className="text-muted fw-semibold">
                              Instances:
                            </span>
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {item.instances.map((instance) => (
                                <LinkBtn
                                  key={instance.id}
                                  to={`/admin/variation-instances/${instance.id}`}
                                  className="d-inline-flex align-items-center gap-1 border rounded px-2 py-1 text-decoration-none bg-light text-dark"
                                  title={`View instance ${instance.sku}`}
                                  disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                                  disabled={!canReadInstance}
                                >
                                  <span
                                    className="font-monospace"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    {instance.sku.split("-")[0]}…
                                  </span>
                                </LinkBtn>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <div className="fw-bold">
                            {centsToUSD(item.totalCents)}
                          </div>
                          <div className="small text-muted">
                            x{item.quantity}
                          </div>
                          <div className="small text-muted">
                            {centsToUSD(
                              Math.round(item.totalCents / item.quantity),
                            )}{" "}
                            each
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* State Timelines */}
              <Accordion defaultActiveKey={["0", "1", "2"]} alwaysOpen>
                {/* Return State History Timeline */}
                <Accordion.Item
                  eventKey="0"
                  className="shadow-sm mb-3 border-0"
                >
                  <Accordion.Header className="bg-white">
                    <h2 className="fs-5 mb-0">Return State History</h2>
                  </Accordion.Header>
                  <Accordion.Body className="bg-white">
                    {canEditReturn && (
                      <div className="d-flex justify-content-end gap-2 mb-3">
                        {canApprove && (
                          <button
                            type="button"
                            className="btn text-success"
                            title="Approve this return request"
                            onClick={() =>
                              setModal((prev) => ({
                                ...prev,
                                returnIdToApprove: returnDetails.id,
                              }))
                            }
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                        )}
                        {canDecline && (
                          <button
                            type="button"
                            className="btn text-danger"
                            title="Decline this return request"
                            onClick={() =>
                              setModal((prev) => ({
                                ...prev,
                                returnIdToDecline: returnDetails.id,
                              }))
                            }
                          >
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        )}
                        {canRefund && (
                          <button
                            type="button"
                            className="btn text-success"
                            title="Refund this return"
                            onClick={() =>
                              setModal((prev) => ({
                                ...prev,
                                returnIdToRefund: returnDetails.id,
                              }))
                            }
                          >
                            <FontAwesomeIcon icon={faMoneyBillTransfer} />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="order-history-timeline newest-first mt-2">
                      {[...returnDetails.states].reverse().map((state, idx) => {
                        const isLatest = idx === 0;
                        const stateData = getReturnState(state.id);

                        return (
                          <div key={state.id} className="timeline-item pb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <OrderReturnStateBadge state={stateData} />
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
                  </Accordion.Body>
                </Accordion.Item>

                {/* Refund State History Timeline */}
                <Accordion.Item
                  eventKey="1"
                  className="shadow-sm mb-3 border-0"
                >
                  <Accordion.Header className="bg-white">
                    <h2 className="fs-5 mb-0">Refund State History</h2>
                  </Accordion.Header>
                  <Accordion.Body className="bg-white">
                    <div className="order-history-timeline newest-first mt-2">
                      {[...returnDetails.refundStates]
                        .reverse()
                        .map((state, idx) => {
                          const isLatest = idx === 0;
                          const stateData = getRefundState(state.id);

                          return (
                            <div key={state.id} className="timeline-item pb-4">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <OrderReturnRefundStateBadge
                                    state={stateData}
                                  />
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
                                        disabledtitle={
                                          DISABLED_TITLE_FOR_VIEWING
                                        }
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
                  </Accordion.Body>
                </Accordion.Item>

                {/* Pickup State History Timeline */}
                <Accordion.Item eventKey="2" className="shadow-sm border-0">
                  <Accordion.Header className="bg-white">
                    <h2 className="fs-5 mb-0">Pickup State History</h2>
                  </Accordion.Header>
                  <Accordion.Body className="bg-white">
                    {canUpdatePickupState && (
                      <div className="d-flex justify-content-end">
                        <button
                          type="button"
                          className="btn text-primary"
                          title="Update pickup state for this return"
                          onClick={() =>
                            setModal((prev) => ({
                              ...prev,
                              returnIdToUpdatePickupState: returnDetails.id,
                            }))
                          }
                        >
                          <FontAwesomeIcon icon={faTruck} />
                        </button>
                      </div>
                    )}
                    <div className="order-history-timeline newest-first mt-2">
                      {[...returnDetails.pickupStates]
                        .reverse()
                        .map((state, idx) => {
                          const isLatest = idx === 0;
                          const stateData = getPickupState(state.id);

                          return (
                            <div key={state.id} className="timeline-item pb-4">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2">
                                  <OrderReturnPickupStateBadge
                                    state={stateData}
                                  />
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
                                        disabledtitle={
                                          DISABLED_TITLE_FOR_VIEWING
                                        }
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
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </div>
          </div>

          {/* Modals */}
          <EditOrderReturnStateModal
            type="approve"
            returnId={modal.returnIdToApprove}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />

          <EditOrderReturnStateModal
            type="decline"
            returnId={modal.returnIdToDecline}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />

          <EditOrderReturnStateModal
            type="refund"
            returnId={modal.returnIdToRefund}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />

          <EditOrderReturnPickupStateModal
            returnId={modal.returnIdToUpdatePickupState}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />
        </>
      )}
    </>
  );
}
