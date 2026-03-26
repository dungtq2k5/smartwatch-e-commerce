import { memo, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import useOrderStore from "../../../store/user/orderStore";
import useOrderStateStore from "../../../store/common/order/orderStateStore";
import type {
  OrderResponse,
  OrderStateResponse,
} from "../../../../../common/types.common";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Loading from "../../common/Loading";
import { PROJECT_NAME } from "../../../../../common/configs.common";
import { Link } from "react-router-dom";
import { MODAL_CLOSE_DELAY_MS } from "../../../configs";

const PaymentDetailModal = memo(
  ({
    orderId,
    onHide,
  }: Readonly<{
    orderId?: string | null; // if not provided -> close modal
    onHide: () => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current++;
    console.log("PaymentDetailModal render count:", renderCount.current);

    const { fetchOrder } = useOrderStore();
    const { fetchOrderState } = useOrderStateStore();

    const [order, setOrder] = useState<OrderResponse | null>(null);
    const [orderState, setOrderState] = useState<OrderStateResponse | null>(
      null
    );

    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const [apiErr, setApiErr] = useState<string | null>(null);

    // Fetch and set on initial load: order, orderState
    useEffect(() => {
      if (orderId) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setIsInitializing(true);
          setApiErr(null);

          try {
            const order = await fetchOrder(orderId);
            setOrder(order);

            const latestOrderState = order.states.at(-1);
            if (latestOrderState) {
              const orderState = await fetchOrderState(latestOrderState.id);
              setOrderState(orderState);
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
        setOrder(null);
        setOrderState(null);
        setApiErr(null);
      }, MODAL_CLOSE_DELAY_MS);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    return (
      <Modal show={!!orderId} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Payment Details</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {isInitializing ? (
            <Loading loadingMsg="Loading payment details..." />
          ) : apiErr ? (
            <ApiError errorMessage={apiErr} />
          ) : !order ? (
            <ApiError errorMessage="Order data not found." />
          ) : !orderState ? (
            <ApiError errorMessage="Order state data not found." />
          ) : (
            <>
              {/* Header */}
              <div className="text-center border-bottom pb-3 mb-4">
                <h1 className="display-6 fw-bold">
                  -{centsToUSD(order.paymentSummary.appliedBalanceCents)}
                </h1>
                <p className="text-success mb-0 fs-5 text-capitalize">
                  Payment{" "}
                  {orderState.lookupId === "1" ? "pending" : "successful"}
                </p>
              </div>

              {/* Main content */}
              <div className="bg-light p-3 rounded mb-4">
                <h2 className="fs-5 fw-semibold mb-2">Info</h2>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Payment to:</p>
                  <p className="mb-0 text-muted">{PROJECT_NAME}</p>
                </div>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Order ID:</p>
                  <p className="mb-0 text-muted">{order.id}</p>
                </div>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Created Time:</p>
                  <p className="mb-0 text-muted">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 pt-3 border-top text-end">
                <Link
                  to={`/account/purchase/order/${order.id}`}
                  className="btn btn-link p-0"
                >
                  View detail this Order
                </Link>
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
    );
  }
);

export default PaymentDetailModal;
