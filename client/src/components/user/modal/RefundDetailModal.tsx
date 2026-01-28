import { memo, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import { PROJECT_NAME } from "../../../../../common/configs.common";
import { Link } from "react-router-dom";
import useReturnStore from "../../../store/user/orderReturnStore";
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";
import type {
  OrderReturnResponse,
  ReturnStateResponse,
} from "../../../../../common/types.common";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";

const RefundDetailModal = memo(
  ({
    orderReturnId,
    onHide,
  }: Readonly<{
    orderReturnId?: string | null; // if not provided -> close modal
    onHide: () => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current++;
    console.log("RefundDetailModal render count:", renderCount.current);

    const { fetchReturn } = useReturnStore();
    const { fetchReturnState } = useReturnStateStore();

    const [orderReturn, setOrderReturn] = useState<OrderReturnResponse | null>(
      null
    );
    const [returnState, setReturnState] = useState<ReturnStateResponse | null>(
      null
    );

    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const [apiErr, setApiErr] = useState<string | null>(null);

    // Fetch and set on initial load: orderReturn, returnState
    useEffect(() => {
      if (orderReturnId) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setIsInitializing(true);
          setApiErr(null);

          try {
            const orderReturn = await fetchReturn(orderReturnId);
            setOrderReturn(orderReturn);

            const latestReturnState = orderReturn.states.at(-1);
            if (latestReturnState) {
              const returnState = await fetchReturnState(latestReturnState.id);
              setReturnState(returnState);
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
        setOrderReturn(null);
        setReturnState(null);
        setApiErr(null);
      }, 200); // small delay to avoid flickering

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderReturnId]);

    return (
      <Modal show={!!orderReturnId} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Refund Details</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {isInitializing ? (
            <Loading loadingMsg="Loading refund details..." />
          ) : apiErr ? (
            <ApiError errorMessage={apiErr} />
          ) : !orderReturn ? (
            <ApiError errorMessage="Order return data not found." />
          ) : !returnState ? (
            <ApiError errorMessage="Return state data not found." />
          ) : (
            <>
              {/* Header */}
              <div className="text-center border-bottom pb-3 mb-4">
                <h1 className="display-6 fw-bold">
                  +{centsToUSD(orderReturn.refundSummary.toBalanceCents)}
                </h1>
                <p className="text-success mb-0 fs-5 text-capitalize">
                  Refund{" "}
                  {returnState.level === 6 ? returnState.name : "pending"}
                </p>
              </div>

              {/* Main content */}
              <div className="bg-light p-3 rounded mb-4">
                <h2 className="fs-5 fw-semibold mb-2">Info</h2>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Refund To:</p>
                  <p className="mb-0 text-muted">
                    {PROJECT_NAME} user's balance
                  </p>
                </div>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Order ID:</p>
                  <p className="mb-0 text-muted">{orderReturn.orderId}</p>
                </div>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Requested At:</p>
                  <p className="mb-0 text-muted">
                    {new Date(orderReturn.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-light p-3 rounded">
                <h2 className="fs-5 fw-semibold mb-2">Return Info</h2>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Return ID:</p>
                  <p className="mb-0 text-muted">{orderReturn.id}</p>
                </div>
                <div className="d-flex justify-content-between">
                  <p className="mb-0 fw-semibold">Total to Refund:</p>
                  <p className="mb-0 text-muted">
                    {centsToUSD(orderReturn.refundSummary.toBalanceCents)}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 pt-3 border-top text-end">
                <Link
                  to={`/account/purchase/return-refund/${orderReturn.id}`}
                  className="btn btn-link p-0"
                >
                  View detail this Refund
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

export default RefundDetailModal;
