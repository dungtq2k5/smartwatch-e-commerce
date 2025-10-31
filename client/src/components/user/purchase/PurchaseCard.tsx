import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type {
  DeliveryStateResponse,
  OrderResponse,
  OrderStateResponse,
  PaymentMethodResponse,
} from "../../../../../common/types.common";
import { useOrderStore } from "../../../store/user/orderStore";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion, faTruck } from "@fortawesome/free-solid-svg-icons";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import PurchaseItem from "./PurchaseItem";
import {
  ORDER_LOOKUPID_MSG_LEGEND,
  ORDER_LOOKUPID_STATE_LEGEND,
  WAITING_EMOJI,
} from "../../../configs";
import toast from "react-hot-toast";
import { useUserCartStore } from "../../../store/user/cartStore";
import { useOrderStateStore } from "../../../store/common/order/orderStateStore";
import { useDeliveryStateStore } from "../../../store/common/order/deliveryStateStore";
import { usePaymentMethodStore } from "../../../store/common/order/paymentMethodStore";
import ApiError from "../../common/ApiError";
import PurchaseCardSkeleton from "../skeleton/PurchaseCardSkeleton";
import SmallSpinner from "../../common/SmallSpinner";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isCreatingCart: boolean;
  isCreatingCheckoutSession: boolean;
};

const PurchaseCard = memo(
  ({
    order,
    onSubmitReceived,
    onCancelOrder,
  }: Readonly<{
    order: OrderResponse;
    onSubmitReceived: (orderId: string) => void;
    onCancelOrder: (orderId: string) => void;
  }>) => {
    const navigate = useNavigate();

    const { getOrderState, getOrderStateSync } = useOrderStateStore();
    const { getDeliveryState, getDeliveryStateSync } = useDeliveryStateStore();
    const { getPaymentMethod, getPaymentMethodSync } = usePaymentMethodStore();
    const {
      checkItemAvailable,
      canSubmitOrder,
      canReturnOrder,
      canCancelOrder,
      canBuyAgainOrder,
      canPay,
      createCheckoutSession,
    } = useOrderStore();
    const { createManyCart } = useUserCartStore();

    const latestOrderState = order.states.at(-1);
    const latestDeliveryState = order.deliveryStates.at(-1);

    const [orderState, setOrderState] = useState<
      OrderStateResponse | undefined
    >(latestOrderState ? getOrderStateSync(latestOrderState.id) : undefined);
    const [deliveryState, setDeliveryState] = useState<
      DeliveryStateResponse | undefined
    >(
      latestDeliveryState
        ? getDeliveryStateSync(latestDeliveryState.id)
        : undefined
    );
    const [paymentMethod, setPaymentMethod] = useState<
      PaymentMethodResponse | undefined
    >(getPaymentMethodSync(order.paymentMethodId));

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isInitializing: false,
      isCreatingCart: false,
      isCreatingCheckoutSession: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    useEffect(() => {
      const handleFetchSetInitialData = async (): Promise<void> => {
        if (orderState && deliveryState && paymentMethod) return;

        setProcess((prev) => ({
          ...prev,
          isProcessing: true,
          isInitializing: true,
        }));
        setApiErr(null);

        try {
          if (!latestOrderState || !latestDeliveryState) {
            throw new Error("Order state or delivery state is missing");
          }

          const [
            orderStateFetched,
            deliveryStateFetched,
            paymentMethodFetched,
          ] = await Promise.all([
            getOrderState(latestOrderState.id),
            getDeliveryState(latestDeliveryState.id),
            getPaymentMethod(order.paymentMethodId),
          ]);

          setOrderState(orderStateFetched);
          setDeliveryState(deliveryStateFetched);
          setPaymentMethod(paymentMethodFetched);
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
    }, []);

    const orderStateDisplay = orderState
      ? ORDER_LOOKUPID_STATE_LEGEND[
          orderState.lookupId as keyof typeof ORDER_LOOKUPID_STATE_LEGEND
        ] || "unknown"
      : "N/A";

    const orderMsgDisplay = orderState
      ? ORDER_LOOKUPID_MSG_LEGEND[
          orderState.lookupId as keyof typeof ORDER_LOOKUPID_MSG_LEGEND
        ] || ""
      : "";

    /*
      Business logic for displaying buttons:
        - canSubmit: if order is "delivered".
        - canReturn: if order canReturn +  is "delivered" or "completed" + at least one item is in "ordered" state.
        - canCancel: if order is "pending" or "confirmed".
        - canBuyAgain: if order is "completed" + at least one item is available.
        - canPay: if order is "pending" + "stripe" payment method.
    */

    const canSubmit = useMemo(() => {
      if (!orderState) return false;
      return canSubmitOrder(orderState.lookupId);
    }, [canSubmitOrder, orderState]);

    const canReturn = useMemo(() => {
      if (!orderState) return false;
      return canReturnOrder(order, orderState.lookupId);
    }, [canReturnOrder, order, orderState]);

    const canCancel = useMemo(() => {
      if (!orderState) return false;
      return canCancelOrder(orderState.lookupId);
    }, [canCancelOrder, orderState]);

    const canBuyAgain = useMemo(() => {
      if (!orderState) return false;
      return canBuyAgainOrder(order, orderState.lookupId);
    }, [orderState, canBuyAgainOrder, order]);

    const notPaidYet = useMemo(() => {
      console.log("Recalculating notPaidYet...");
      if (!orderState || !paymentMethod) return false;
      return canPay(orderState.lookupId, paymentMethod.lookupId);
    }, [orderState, paymentMethod, canPay]);

    const availableItems = useMemo(
      () => order.items.filter((item) => checkItemAvailable(item)),
      [checkItemAvailable, order.items]
    );

    const handleBuyAgain = useCallback(async (): Promise<void> => {
      if (!canBuyAgain) {
        toast.error("Cannot buy again for this order.");
        return;
      }

      if (process.isProcessing) {
        toast("Another action is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      if (availableItems.length === 0) {
        toast.error("No available items to buy again.");
        return;
      }

      // Add to cart
      const cartData = availableItems.map((item) => ({
        variationId: item.variation.id,
        quantity: item.quantity,
      }));

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isCreatingCart: true,
      }));
      try {
        await createManyCart({ items: cartData });
        navigate("/cart");
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isCreatingCart: false,
        }));
      }
    }, [
      availableItems,
      canBuyAgain,
      createManyCart,
      navigate,
      process.isProcessing,
    ]);

    const handlePayNow = useCallback(async (): Promise<void> => {
      if (!notPaidYet) {
        toast.error("Cannot pay for this order.");
        return;
      }

      if (process.isProcessing) {
        toast("Another action is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      try {
        const checkout = await createCheckoutSession(order.id);
        globalThis.location.href = checkout.url;
      } catch (error) {
        toast.error(formatError(error));
      }
    }, [createCheckoutSession, notPaidYet, order.id, process.isProcessing]);

    return (
      <>
        {process.isInitializing ? (
          <PurchaseCardSkeleton />
        ) : apiErr ? (
          <ApiError errMsg={apiErr} />
        ) : (
          <div className="card mb-3">
            {/* Header */}
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <p className="mb-0 small text-muted">Order ID: {order.id}</p>
              {!deliveryState ? (
                <p className="mb-0 text-danger">N/A</p>
              ) : (
                <div className="d-flex align-items-center text-uppercase small">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-success text-decoration-none"
                    onClick={() => navigate(`order/${order.id}`)}
                  >
                    <FontAwesomeIcon icon={faTruck} className="me-2" />
                    <span className="text-capitalize">
                      {deliveryState.name}
                    </span>
                  </button>
                  <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="ms-2 text-muted"
                    title={`Latest update time: ${
                      latestDeliveryState?.createdAt
                        ? new Date(
                            latestDeliveryState.createdAt
                          ).toLocaleString()
                        : "N/A"
                    }`}
                  />
                  <span className="ms-2 border-start ps-2 fw-bold text-primary">
                    {orderStateDisplay.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Item list */}
            <Link
              to={`order/${order.id}`}
              className="text-decoration-none text-dark"
            >
              <div className="card-body">
                {order.items.map((item, idx) => (
                  <div
                    key={item.variation.id}
                    className={`pb-3 ${
                      idx < order.items.length - 1 ? "mb-3 border-bottom" : ""
                    }`}
                  >
                    <PurchaseItem type="order" item={item} />
                  </div>
                ))}
              </div>
            </Link>

            {/* Footer */}
            <div className="card-footer bg-light-subtle">
              <p className="mb-4 text-end">
                Order Total:{" "}
                <span className="fs-5 fw-bold text-primary">
                  {centsToUSD(order.paymentSummary.finalAmountCents)}
                </span>
              </p>
              <div
                className={`d-flex ${
                  orderMsgDisplay
                    ? "justify-content-between "
                    : "justify-content-end"
                } align-items-center mb-2`}
              >
                {orderMsgDisplay && (
                  <p className="m-0 text-muted small">{orderMsgDisplay}</p>
                )}
                <div className="d-flex gap-3">
                  {canSubmit && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onSubmitReceived(order.id)}
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
                        navigate(`return-refund/create/${order.id}`)
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
                      onClick={() => onCancelOrder(order.id)}
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
                      {process.isCreatingCart ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            aria-hidden="true"
                          ></span>
                          <output>Adding to cart...</output>
                        </>
                      ) : (
                        "Buy Again"
                      )}
                    </button>
                  )}
                  {notPaidYet && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handlePayNow}
                      disabled={process.isProcessing}
                    >
                      {process.isCreatingCheckoutSession && (
                        <>
                          <SmallSpinner />{" "}
                        </>
                      )}
                      Pay Now with <span className="fw-bold">Stripe</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

export default PurchaseCard;
