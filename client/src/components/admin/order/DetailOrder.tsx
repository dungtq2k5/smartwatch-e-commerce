import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { AdminOrderDetailsResponse } from "../../../../../common/types.common";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faCircleXmark,
  faTriangleExclamation,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import PaymentMethodBadge from "../PaymentMethodBadge";
import PaymentStateBadge from "../PaymentStateBadge";
import DeliveryStateBadge from "../DeliveryStateBadge";
import OrderStateBadge from "../OrderStateBadge";
import defaultProductImg from "../../../assets/default-product.webp";
import SlashColor from "../../common/SlashColor";
import LinkBtn from "../../common/LinkBtn";
import EditOrderDeliveryStateModal from "./EditOrderDeliveryStateModal";
import EditOrderEstReceivedDateModal from "./EditOrderEstReceivedDateModal";
import MapLink from "../../common/MapLink";
import InstanceStateBadge from "../InstanceStateBadge";
import DetailOrderSkeleton from "../skeleton/DetailOrderSkeleton";
import usePaymentMethodStore from "../../../store/common/order/paymentMethodStore";
import usePaymentStateStore from "../../../store/common/order/paymentStateStore";
import useDeliveryStateStore from "../../../store/common/order/deliveryStateStore";
import useOrderStateStore from "../../../store/common/order/orderStateStore";

type Modal = {
  editDeliveryState: boolean;
  editEstReceivedDate: boolean;
};

export default function DetailOrder() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailOrder render count:", renderCount.current);

  const { id } = useParams();

  const { fetchOrderDetails, canEditOrder: editableOrder } = useOrderStore();
  const { paymentMethods, fetchPaymentMethods, getPaymentMethod } =
    usePaymentMethodStore();
  const { paymentStates, fetchPaymentStates, getPaymentState } =
    usePaymentStateStore();
  const { deliveryStates, fetchDeliveryStates, getDeliveryState } =
    useDeliveryStateStore();
  const { orderStates, fetchOrderStates, getOrderState } = useOrderStateStore();
  const { signals, refresh } = useRefreshStore();

  const [canReadUser, canReadProduct, canReadInstance] = [
    useHasPermission("r_usr"),
    useHasPermission("r_product"),
    useHasPermission("r_variation_instance"),
  ];

  const [orderDetails, setOrderDetails] =
    useState<AdminOrderDetailsResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    editDeliveryState: false,
    editEstReceivedDate: false,
  });

  // Fetch and set initial data
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Order ID is missing.");

        const [fetchedOrderDetails] = await Promise.all([
          fetchOrderDetails(id),
          paymentMethods ? Promise.resolve() : fetchPaymentMethods(),
          paymentStates ? Promise.resolve() : fetchPaymentStates(),
          deliveryStates ? Promise.resolve() : fetchDeliveryStates(),
          orderStates ? Promise.resolve() : fetchOrderStates(),
        ]);

        setOrderDetails(fetchedOrderDetails);
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
    setModal({
      editDeliveryState: false,
      editEstReceivedDate: false,
    });
  }, []);

  const onSuccessUpdate = useCallback((): void => {
    refresh("admin");
    closeModal();
  }, [refresh, closeModal]);

  // Since this is a detail page which is only render 1 time so don't need to worry about re-render problems
  const canEditOrder =
    useHasPermission("u_order") &&
    editableOrder(orderDetails?.states.at(-1)?.lookupId || "");
  const latestOrderState = getOrderState(orderDetails?.states.at(-1)?.id || "");
  const latestDeliveryState = getDeliveryState(
    orderDetails?.deliveryStates.at(-1)?.id || "",
  );
  const latestPaymentState = getPaymentState(
    orderDetails?.paymentStates.at(-1)?.id || "",
  );

  return (
    <>
      {isInitializing ? (
        <DetailOrderSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !orderDetails ? (
        <ApiError errorMessage="Order details not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Order Details #${orderDetails.id}`}
            parentTitle="Orders Management"
            parentLink="/admin/orders"
            className="mb-4"
          />

          <div className="row g-4">
            {/* Left Column: Order Info */}
            <div className="col-12 col-xl-4 col-md-5">
              {/* Order Information Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">Order Information</h2>
                </div>
                <div className="card-body">
                  {/* Current state badges */}
                  <div className="mb-3 d-flex flex-wrap gap-2">
                    <OrderStateBadge state={latestOrderState} />
                    <DeliveryStateBadge state={latestDeliveryState} />
                    <PaymentStateBadge state={latestPaymentState} />
                  </div>

                  <hr className="text-muted opacity-25" />

                  <div className="row">
                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Order ID
                      </span>
                      <div className="small font-monospace text-break">
                        {orderDetails.id}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Ordered By
                      </span>
                      <div>
                        <DetailUserLink
                          userId={orderDetails.orderedBy.id}
                          disabled={!canReadUser}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                        >
                          {orderDetails.orderedBy.fullName}
                        </DetailUserLink>
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Order Date
                      </span>
                      <div className="small">
                        {orderDetails.orderDate
                          ? new Date(orderDetails.orderDate).toLocaleString()
                          : "N/A"}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Payment Method
                      </span>
                      <div>
                        <PaymentMethodBadge
                          method={getPaymentMethod(
                            orderDetails.paymentMethod.id,
                          )}
                        />
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Est. Received Date
                      </span>
                      <div>
                        <span className="small">
                          {orderDetails.estimateReceivedDate
                            ? new Date(
                                orderDetails.estimateReceivedDate,
                              ).toLocaleDateString()
                            : "Not set"}
                        </span>
                        {canEditOrder && (
                          <>
                            <span> - </span>
                            <button
                              type="button"
                              className="btn btn-link p-0"
                              title="Edit estimated received date"
                              onClick={() =>
                                setModal((prev) => ({
                                  ...prev,
                                  editEstReceivedDate: true,
                                }))
                              }
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Received Date
                      </span>
                      <div className="small">
                        {orderDetails.receivedDate
                          ? new Date(orderDetails.receivedDate).toLocaleString()
                          : "Not yet received"}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Returnable
                      </span>
                      <div>
                        {orderDetails.canReturn ? (
                          <span className="badge bg-success">
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="me-1"
                            />
                            Yes
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            <FontAwesomeIcon
                              icon={faCircleXmark}
                              className="me-1"
                            />
                            No
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Fulfilled By
                      </span>
                      <div>
                        {orderDetails.fulfilledBy ? (
                          <>
                            <DetailUserLink
                              userId={orderDetails.fulfilledBy.id}
                              disabled={!canReadUser}
                              disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                            >
                              {orderDetails.fulfilledBy.fullName}
                            </DetailUserLink>
                            <div className="small text-muted">
                              {new Date(
                                orderDetails.fulfilledAt,
                              ).toLocaleString()}
                            </div>
                          </>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            Not Fulfilled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Created At
                      </span>
                      <div className="small">
                        {new Date(orderDetails.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="col-sm-6 mb-3">
                      <span className="small text-uppercase fw-bold text-muted">
                        Last Updated
                      </span>
                      <div className="small">
                        {new Date(orderDetails.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Cancel Reason if exists */}
                  {orderDetails.buyerCancelReason && (
                    <div className="alert alert-danger d-flex align-items-start p-2 mb-0">
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        className="me-2 mt-1 flex-shrink-0"
                      />
                      <div className="small">
                        <strong>Order Cancelled:</strong>{" "}
                        {orderDetails.buyerCancelReason.name}
                        {orderDetails.buyerCancelReason.description && (
                          <div className="text-muted mt-1">
                            {orderDetails.buyerCancelReason.description}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">Delivery Address</h2>
                </div>
                <div className="card-body">
                  <p className="fw-semibold mb-1">
                    {orderDetails.deliveryAddress.name}
                  </p>
                  <p className="small text-muted mb-1">
                    {orderDetails.deliveryAddress.phoneNumber}
                  </p>
                  <p className="small text-muted mb-1">
                    {orderDetails.deliveryAddress.fullAddress}
                  </p>
                  <div className="text-end">
                    <MapLink
                      latitude={
                        orderDetails.deliveryAddress.location.coordinates[0]
                      }
                      longitude={
                        orderDetails.deliveryAddress.location.coordinates[1]
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Payment Summary Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">Payment Summary</h2>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Subtotal:</span>
                    <span>
                      {centsToUSD(orderDetails.paymentSummary.subtotalCents)}
                    </span>
                  </div>
                  {orderDetails.paymentSummary.appliedBalanceCents > 0 && (
                    <div className="d-flex justify-content-between mb-2 small text-success">
                      <span>Applied Balance:</span>
                      <span>
                        -
                        {centsToUSD(
                          orderDetails.paymentSummary.appliedBalanceCents,
                        )}
                      </span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total:</span>
                    <span className="text-primary">
                      {centsToUSD(orderDetails.paymentSummary.finalAmountCents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction Card */}
              {orderDetails.transaction && (
                <div className="card shadow-sm border-0">
                  <div className="card-header bg-white py-3">
                    <h2 className="fs-5 card-title mb-0">
                      Transaction Details
                    </h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Amount
                        </span>
                        <div className="small fw-semibold">
                          {centsToUSD(orderDetails.transaction.amountCents)}{" "}
                          {orderDetails.transaction.currency?.toUpperCase()}
                        </div>
                      </div>
                      <div className="col-sm-6 mb-3">
                        <span className="small text-uppercase fw-bold text-muted">
                          Transaction Date
                        </span>
                        <div className="small">
                          {new Date(
                            orderDetails.transaction.transactionDate,
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div className="col-12">
                        <span className="small text-uppercase fw-bold text-muted">
                          Payment Intent ID
                        </span>
                        <div className="font-monospace small text-break">
                          {orderDetails.transaction.paymentIntentId}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Items & State Timelines */}
            <div className="col-12 col-xl-8 col-md-7">
              {/* Order Items Card */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">
                    Order Items ({orderDetails.items.length})
                  </h2>
                </div>
                <div className="card-body">
                  {orderDetails.items.map((item, idx) => {
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
                          idx < orderDetails.items.length - 1
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
                                  <InstanceStateBadge state={instance.state} />
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

              {/* Order States Timeline */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">Order State History</h2>
                </div>
                <div className="card-body">
                  <div className="order-history-timeline newest-first mt-2">
                    {[...orderDetails.states].reverse().map((state, idx) => {
                      const isLatest = idx === 0;

                      return (
                        <div key={state.id} className="timeline-item pb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <OrderStateBadge
                                state={getOrderState(state.id)}
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

              {/* Delivery States Timeline */}
              <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">
                    Delivery State History
                  </h2>
                  <div className="d-flex align-items-center gap-2">
                    {canEditOrder && (
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            editDeliveryState: true,
                          }))
                        }
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <div className="order-history-timeline newest-first mt-2">
                    {[...orderDetails.deliveryStates]
                      .reverse()
                      .map((state, idx) => {
                        const isLatest = idx === 0;

                        return (
                          <div key={state.id} className="timeline-item pb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <DeliveryStateBadge
                                  state={getDeliveryState(state.id)}
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

              {/* Payment States Timeline */}
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">
                    Payment State History
                  </h2>
                </div>
                <div className="card-body">
                  <div className="order-history-timeline newest-first mt-2">
                    {[...orderDetails.paymentStates]
                      .reverse()
                      .map((state, idx) => {
                        const isLatest = idx === 0;

                        return (
                          <div key={state.id} className="timeline-item pb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <PaymentStateBadge
                                  state={getPaymentState(state.id)}
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
          <EditOrderDeliveryStateModal
            orderId={modal.editDeliveryState ? orderDetails.id : undefined}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />

          <EditOrderEstReceivedDateModal
            orderId={modal.editEstReceivedDate ? orderDetails.id : undefined}
            onHide={closeModal}
            onSuccess={onSuccessUpdate}
          />
        </>
      )}
    </>
  );
}
