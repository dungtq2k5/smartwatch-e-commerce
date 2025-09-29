import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type {
  DeliveryStateResponse,
  OrderResponse,
  OrderStateResponse,
  PaymentMethodResponse,
} from "../../../../common/types.common";
import { useOrderStore } from "../../store/order/orderStore";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion, faTruck } from "@fortawesome/free-solid-svg-icons";
import {
  capFirstLetter,
  centsToUSD,
  formatError,
} from "../../../../common/utils.common";
import PurchaseItem from "./PurchaseItem";
import {
  ORDER_LOOKUPID_MSG_LEGEND,
  ORDER_LOOKUPID_STATE_LEGEND,
} from "../../configs";
import toast from "react-hot-toast";
import { useUserCartStore } from "../../store/cartStore";
import { useOrderStateStore } from "../../store/order/orderStateStore";
import { useDeliveryStateStore } from "../../store/order/deliveryStateStore";
import { usePaymentMethodStore } from "../../store/order/paymentMethodStore";
import ApiError from "../ApiError";

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

    const [isInitializing, setIsInitializing] = useState<boolean>(
      !orderState || !deliveryState
    );
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [isCreatingCart, setIsCreatingCart] = useState<boolean>(false);

    useEffect(() => {
      const handleFetchSetInitialData = async (): Promise<void> => {
        if (orderState && deliveryState && paymentMethod) return;

        setIsInitializing(true);
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
          setIsInitializing(false);
        }
      };

      handleFetchSetInitialData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const orderStateDisplay = !orderState
      ? "N/A"
      : ORDER_LOOKUPID_STATE_LEGEND[
          orderState.lookupId as keyof typeof ORDER_LOOKUPID_STATE_LEGEND
        ] || "unknown";

    const orderMsgDisplay = !orderState
      ? ""
      : ORDER_LOOKUPID_MSG_LEGEND[
          orderState.lookupId as keyof typeof ORDER_LOOKUPID_MSG_LEGEND
        ] || "";

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

      if (availableItems.length === 0) {
        toast.error("No available items to buy again.");
        return;
      }

      // Add to cart
      const cartData = availableItems.map((item) => ({
        variationId: item.variation.id,
        quantity: item.quantity,
      }));

      setIsCreatingCart(true);
      try {
        await createManyCart({ items: cartData });
        navigate("/cart");
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setIsCreatingCart(false);
      }
    }, [availableItems, canBuyAgain, createManyCart, navigate]);

    // TODO not paid yet button to redirect to payment gateway
    return (
      <>
        {isInitializing ? (
          <p>Loading....</p> // TODO loading skeleton
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
                    <span>{capFirstLetter(deliveryState.name)}</span>
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
                      disabled={isCreatingCart}
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
                      disabled={isCreatingCart}
                    >
                      Request For Return/Refund
                    </button>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => onCancelOrder(order.id)}
                      disabled={isCreatingCart}
                    >
                      Cancel Order
                    </button>
                  )}
                  {canBuyAgain && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBuyAgain}
                      disabled={isCreatingCart}
                    >
                      {isCreatingCart ? (
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
                      onClick={() =>
                        console.log("TODO redirect to payment gateway")
                      }
                      disabled={isCreatingCart}
                    >
                      Pay Now
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
