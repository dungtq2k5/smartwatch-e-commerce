import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useOrderStore from "../../../store/user/orderStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { formatError, centsToUSD } from "../../../../../common/utils.common";
import PurchaseItem from "./PurchaseItem";
import type {
  OrderDetailsResponse,
  OrderStateListResponse,
} from "../../../../../common/types.common";
import useOrderStateStore from "../../../store/common/order/orderStateStore";
import ApiError from "../../common/ApiError";
import {
  ORDER_STATE_LEVEL_ICON_LEGEND,
  ORDER_STATE_LEVEL_MSG_LEGEND,
  WAITING_EMOJI,
} from "../../../configs";
import SelectAddressModal from "../modal/SelectAddressModal";
import toast from "react-hot-toast";
import ConfirmSubmitModal from "../modal/ConfirmSubmitModal";
import useUserCartStore from "../../../store/user/cartStore";
import PurchaseDetailSkeleton from "../skeleton/PurchaseDetailSkeleton";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdatingDeliveryAddress: boolean;
};

type Modal = {
  changeAddress: boolean;
  submitReceived: boolean;
  cancelOrder: boolean;
};

export default function PurchaseDetail() {
  // DEV temp for testing
  const count = useRef(0);
  count.current += 1;
  console.log(`PurchaseDetail rendered ${count.current} times`);

  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const { orderStates, fetchOrderStates, getOrderStateByLookupId } =
    useOrderStateStore();
  const {
    fetchOrderDetails,
    updateSelfOrder,
    checkItemAvailable,
    canChangeDeliveryAddress,
    canSubmitOrder,
    canReturnOrder,
    canCancelOrder,
    canBuyAgainOrder,
  } = useOrderStore();
  const { createManyCart } = useUserCartStore();

  const [orderDetails, setOrderDetails] = useState<OrderDetailsResponse | null>(
    null,
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUpdatingDeliveryAddress: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    changeAddress: false,
    submitReceived: false,
    cancelOrder: false,
  });

  const currStatus = orderDetails?.states.at(-1);
  const currStatusLevel = currStatus?.level || 0;

  const canChangeAddress = useMemo(() => {
    if (!currStatus) return false;
    return canChangeDeliveryAddress(currStatus?.lookupId);
  }, [canChangeDeliveryAddress, currStatus]);

  const canSubmit = useMemo(() => {
    if (!currStatus) return false;
    return canSubmitOrder(currStatus.lookupId);
  }, [canSubmitOrder, currStatus]);

  const canReturn = useMemo(() => {
    if (!currStatus || !orderDetails) return false;
    return canReturnOrder(orderDetails, currStatus.lookupId);
  }, [canReturnOrder, orderDetails, currStatus]);

  const canCancel = useMemo(() => {
    if (!currStatus) return false;
    return canCancelOrder(currStatus.lookupId);
  }, [canCancelOrder, currStatus]);

  const canBuyAgain = useMemo(() => {
    if (!currStatus || !orderDetails) return false;
    return canBuyAgainOrder(orderDetails, currStatus.lookupId);
  }, [currStatus, canBuyAgainOrder, orderDetails]);

  const availableItems = useMemo(
    () => orderDetails?.items.filter((item) => checkItemAvailable(item)) || [],
    [checkItemAvailable, orderDetails?.items],
  );

  // Fetch initial when first loaded: orderDetails, orderId changes, orderStates
  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!orderId) throw new Error("Order ID is not provided");

        const [fetchedOrderDetails] = await Promise.all([
          fetchOrderDetails(orderId),
          orderStates ? Promise.resolve() : fetchOrderStates(),
        ]);

        setOrderDetails(fetchedOrderDetails);
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

    handleFetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const genProgressBar = useCallback(
    (
      states: Omit<OrderStateListResponse["states"][number], "description">[],
      orderDetailsStates: OrderDetailsResponse["states"],
    ): JSX.Element => {
      return (
        <div className="row justify-content-center mb-4">
          {states.map((state, idx) => {
            if (state.lookupId === "7") return null; // only display up to "completed"
            const stepLevel = idx + 1;
            const isCompleted = currStatusLevel >= stepLevel;
            const isActive = currStatusLevel === stepLevel;
            const createdAt = orderDetailsStates.find(
              (s) => s.id === state.id,
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
                      ORDER_STATE_LEVEL_ICON_LEGEND[
                        state.level as keyof typeof ORDER_STATE_LEVEL_ICON_LEGEND
                      ] || faQuestion
                    }
                  />
                </div>
                <p className="mt-2 mb-0">
                  Order <span className="text-capitalize">{state.name}</span>
                </p>
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
    [currStatusLevel],
  );

  /*
    Business logic for displaying buttons:
      - canChangeAddress: only if order is "pending", "confirmed".
      - canSubmit: only if order is "delivered".
      - canReturn: only if order canReturn +  is "delivered" or "completed" + at least one item is in "ordered" state.
      - canCancel: only if order is "pending" or "confirmed".
      - canBuyAgain: only if order is "completed" + at least one item is available.
  */

  const closeModal = useCallback((): void => {
    setModal({
      changeAddress: false,
      submitReceived: false,
      cancelOrder: false,
    });
  }, []);

  const handleUpdateDeliveryAddress = useCallback(
    async (addressId: string): Promise<void> => {
      if (!orderDetails) {
        toast.error("Order detail is not available");
        return;
      }
      if (!canChangeAddress) {
        toast.error("You cannot change the address for this order");
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isUpdatingDeliveryAddress: true,
      }));
      try {
        const updatedOrder = await updateSelfOrder(orderDetails.id, {
          deliveryAddressId: addressId,
        });

        setOrderDetails({
          ...orderDetails,
          deliveryAddress: updatedOrder.deliveryAddress,
          updatedAt: updatedOrder.updatedAt,
        });
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isUpdatingDeliveryAddress: false,
        }));
      }
    },
    [canChangeAddress, orderDetails, updateSelfOrder],
  );

  const handleSubmitReceived = useCallback(async (): Promise<void> => {
    if (!orderDetails) {
      toast.error("Order detail is not available");
      return;
    }
    if (!canSubmit) {
      toast.error("You cannot submit received for this order");
      return;
    }
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({ ...prev, isProcessing: true }));
    try {
      const completeState = getOrderStateByLookupId("6"); // "completed"
      if (!completeState) throw new Error("Order state 'completed' not found");

      await updateSelfOrder(orderDetails.id, {
        stateId: completeState.id,
      });

      // Refresh order detail
      const updatedOrderDetails = await fetchOrderDetails(orderDetails.id);
      setOrderDetails(updatedOrderDetails);
      toast.success("Order marked as received.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [
    canSubmit,
    fetchOrderDetails,
    getOrderStateByLookupId,
    orderDetails,
    process.isProcessing,
    updateSelfOrder,
  ]);

  const handleSubmitCancelOrder = useCallback(async (): Promise<void> => {
    if (!orderDetails) {
      toast.error("Order detail is not available");
      return;
    }
    if (!canCancel) {
      toast.error("You cannot cancel this order");
      return;
    }
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({ ...prev, isProcessing: true }));
    try {
      const cancelState = getOrderStateByLookupId("7"); // "cancelled"
      if (!cancelState) throw new Error("Order state 'cancelled' not found");

      await updateSelfOrder(orderDetails.id, {
        stateId: cancelState.id,
      });

      // Refresh order detail
      const updatedOrderDetails = await fetchOrderDetails(orderDetails.id);
      setOrderDetails(updatedOrderDetails);
      toast.success("Order has been cancelled.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [
    canCancel,
    fetchOrderDetails,
    getOrderStateByLookupId,
    orderDetails,
    process.isProcessing,
    updateSelfOrder,
  ]);

  const handleBuyAgain = useCallback(async (): Promise<void> => {
    if (!orderDetails) {
      toast.error("Order detail is not available");
      return;
    }
    if (!canBuyAgain) {
      toast.error("Cannot buy again for this order.");
      return;
    }
    if (availableItems.length === 0) {
      toast.error("No available items to buy again.");
      return;
    }
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    // Add to cart
    const cartData = availableItems.map((item) => ({
      variationId: item.variation.id,
      quantity: item.quantity,
    }));

    setProcess((prev) => ({ ...prev, isProcessing: true }));
    try {
      await createManyCart({ items: cartData });
      navigate("/cart");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [
    availableItems,
    canBuyAgain,
    createManyCart,
    navigate,
    orderDetails,
    process.isProcessing,
  ]);

  // TODO Display cancel reason if order is cancelled
  return (
    <>
      {process.isInitializing ? (
        <PurchaseDetailSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !orderStates ? (
        <ApiError errorMessage="Order state data is not available." />
      ) : !orderDetails ? (
        <ApiError errorMessage="Order detail data is not available." />
      ) : (
        <>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none text-dark"
              onClick={() => navigate(-1)}
              disabled={process.isProcessing}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
              Back to Purchases
            </button>
            <div className="text-end d-flex align-items-center gap-2">
              <p className="mb-0 text-muted">Order ID: {orderDetails.id}</p>
              <p className="mb-0">|</p>
              <p className="mb-0 text-primary text-uppercase">
                order {currStatus?.name || "N/A"}
              </p>
            </div>
          </div>

          {/* Order Info */}
          <div className="border-bottom pb-4 mb-4">
            <h2 className="fs-4 mb-4">Order Info</h2>
            {/* Progress bar */}
            {
              // If the order is cancelled, display the states from orderDetails only, otherwise display all states
              genProgressBar(
                orderDetails.states.some((s) => s.lookupId === "7")
                  ? orderDetails.states
                  : orderStates.states,
                orderDetails.states,
              )
            }
            {/* Delivery address and states */}
            <div className="d-flex gap-3">
              {/* Delivery address - on the left */}
              <div
                className={`bg-light p-3 rounded w-100 h-100 ${
                  process.isUpdatingDeliveryAddress ? "opacity-50" : ""
                }`}
              >
                <h3 className="fs-5 fw-semibold mb-3">
                  Delivery Address{" "}
                  {canChangeAddress && (
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() =>
                        setModal((prev) => ({ ...prev, changeAddress: true }))
                      }
                      disabled={process.isProcessing}
                    >
                      (
                      {process.isUpdatingDeliveryAddress
                        ? "updating..."
                        : "edit"}
                      )
                    </button>
                  )}
                </h3>
                <div>
                  <p className="fw-bold mb-1">
                    {orderDetails.deliveryAddress.name}
                  </p>
                  <p className="text-muted mb-1">
                    {orderDetails.deliveryAddress.phoneNumber}
                  </p>
                  <p className="text-muted mb-0">
                    {orderDetails.deliveryAddress.fullAddress}
                  </p>
                </div>
              </div>

              {/* Delivery states - on the right */}
              <div className="bg-light p-3 rounded w-100 h-100">
                <div className="mb-3">
                  <h3 className="fs-5 fw-semibold">Delivery History</h3>
                  {orderDetails.estimateReceivedDate && (
                    <span className="text-success">
                      Estimated delivery date:{" "}
                      {new Date(
                        orderDetails.estimateReceivedDate,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <ul className="list-unstyled order-history-timeline">
                  {orderDetails.deliveryStates.map((state, idx) => (
                    <li
                      key={state.id}
                      className={`mb-3 timeline-item ${
                        idx === orderDetails.deliveryStates.length - 1
                          ? "text-success-emphasis"
                          : ""
                      }`}
                    >
                      <p className="mb-0">
                        <span className="fw-bold">
                          {state.name.toUpperCase()}
                        </span>{" "}
                        - {new Date(state.createdAt).toLocaleString()}
                      </p>
                      {state.notes && (
                        <p className="text-muted small mb-0">{state.notes}</p>
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
                  ORDER_STATE_LEVEL_MSG_LEGEND[
                    currStatusLevel as keyof typeof ORDER_STATE_LEVEL_MSG_LEGEND
                  ]
                }
              </p>
              <div className="d-flex gap-3 flex-column">
                {canSubmit && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setModal({ ...modal, submitReceived: true })}
                    disabled={process.isProcessing}
                  >
                    Submit Received
                  </button>
                )}
                {canReturn && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      navigate(`/return-refund/create/${orderDetails.id}`)
                    }
                    disabled={process.isProcessing}
                  >
                    Request For Return/Refund
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setModal({ ...modal, cancelOrder: true })}
                    disabled={process.isProcessing}
                  >
                    Cancel Order
                  </button>
                )}
                {canBuyAgain && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBuyAgain}
                    disabled={process.isProcessing}
                  >
                    Buy Again
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Items and summary */}
          <div>
            <h2 className="fs-4 mb-3">Items</h2>
            <div className="row">
              {/* Items list */}
              <div className="col-lg-8">
                {orderDetails.items.map((item, idx) => (
                  <Link
                    key={item.variation.id}
                    to={`/products/${item.variation.productModel.product.id}`}
                    className="text-decoration-none text-dark"
                  >
                    <div
                      className={`pb-3 ${
                        idx < orderDetails.items.length - 1
                          ? "mb-3 border-bottom"
                          : ""
                      }`}
                    >
                      <PurchaseItem type="order" item={item} />
                    </div>
                  </Link>
                ))}
              </div>
              {/* Payment summary */}
              <div className="col-lg-4">
                <div className="card border-0 bg-light">
                  <div className="card-body">
                    <h3 className="fs-5 fw-semibold mb-3">Payment Summary</h3>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Subtotal:</span>
                      <span>
                        {centsToUSD(orderDetails.paymentSummary.subtotalCents)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Shipping Fee:</span>
                      <span>{centsToUSD(0)}</span>
                    </div>
                    {orderDetails.paymentSummary.appliedBalanceCents > 0 && (
                      <div className="d-flex justify-content-between mb-2 text-success">
                        <span>Applied Balance:</span>
                        <span>
                          -
                          {centsToUSD(
                            orderDetails.paymentSummary.appliedBalanceCents,
                          )}
                        </span>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                      <span>Total:</span>
                      <span>
                        {centsToUSD(
                          orderDetails.paymentSummary.finalAmountCents,
                        )}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between text-muted">
                      <span>Payment method:</span>
                      <span className="text-capitalize">
                        {orderDetails.paymentMethod.name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
          <SelectAddressModal
            currentAddressId={undefined}
            show={modal.changeAddress}
            onHide={closeModal}
            onSelect={handleUpdateDeliveryAddress}
          />

          <ConfirmSubmitModal
            show={!!modal.submitReceived}
            onHide={closeModal}
            onSubmit={handleSubmitReceived}
            custom={{
              action: "update",
              title: "Confirm Submit Received",
              body: "Confirm that oyu have received all items in this order. You can still be able to request a return or refund later if needed.",
              cancelText: "Not yet",
              submitText: "Yes, I've received",
            }}
          />

          <ConfirmSubmitModal
            show={!!modal.cancelOrder}
            onHide={closeModal}
            onSubmit={handleSubmitCancelOrder}
            custom={{
              action: "delete",
              title: "Confirm Cancel Order",
              body: "Are you sure you want to cancel this order? You won't be able to undo this action.",
              cancelText: "No, go back",
              submitText: "Yes, cancel order",
            }}
          />
        </>
      )}
    </>
  );
}
