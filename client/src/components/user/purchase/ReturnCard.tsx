import { memo, useEffect, useMemo, useState } from "react";
import type {
  OrderReturnResponse,
  ReturnStateResponse,
} from "../../../../../common/types.common";
import { Link, useNavigate } from "react-router-dom";
import PurchaseItem from "./PurchaseItem";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import {
  RETURN_LOOKUPID_MSG_LEGEND,
  RETURN_LOOKUPID_STATE_LEGEND,
} from "../../../configs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion, faTruck } from "@fortawesome/free-solid-svg-icons";
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";
import useReturnStore from "../../../store/user/orderReturnStore";
import ApiError from "../../common/ApiError";
import PurchaseCardSkeleton from "../skeleton/PurchaseCardSkeleton";

const ReturnCard = memo(
  ({
    orderReturn,
    onCancelReturn,
  }: Readonly<{
    orderReturn: OrderReturnResponse;
    onCancelReturn: (orderId: string, returnId: string) => void;
  }>) => {
    const navigate = useNavigate();

    const { fetchReturnState, getReturnState } = useReturnStateStore();
    const { canUpdateReturn } = useReturnStore();

    const latestReturnState = orderReturn.states.at(-1);

    const [returnState, setReturnState] = useState<
      ReturnStateResponse | undefined
    >(latestReturnState ? getReturnState(latestReturnState.id) : undefined);

    const [isInitializing, setIsInitializing] = useState<boolean>(false);
    const [apiErr, setApiErr] = useState<string | null>(null);

    useEffect(() => {
      const handleFetchSetInitialData = async (): Promise<void> => {
        if (returnState) return;

        setIsInitializing(true);
        setApiErr(null);

        try {
          if (!latestReturnState) {
            throw new Error("No return state found");
          }

          setReturnState(await fetchReturnState(latestReturnState.id));
        } catch (error) {
          setApiErr(formatError(error));
        } finally {
          setIsInitializing(false);
        }
      };

      handleFetchSetInitialData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const returnStateDisplay = !returnState
      ? "N/A"
      : RETURN_LOOKUPID_STATE_LEGEND[
          returnState.lookupId as keyof typeof RETURN_LOOKUPID_STATE_LEGEND
        ] || "unknown";
    const returnMsgDisplay = !returnState
      ? ""
      : RETURN_LOOKUPID_MSG_LEGEND[
          returnState.lookupId as keyof typeof RETURN_LOOKUPID_MSG_LEGEND
        ] || "";

    /*
      Business logic for displaying buttons:
        - canUpdate(cancel): only if orderReturn is "pending approval".
    */

    const canUpdate = useMemo(() => {
      if (!returnState) return false;
      return canUpdateReturn(returnState.lookupId);
    }, [canUpdateReturn, returnState]);

    return (
      <>
        {isInitializing ? (
          <PurchaseCardSkeleton />
        ) : apiErr ? (
          <ApiError errMsg={apiErr} />
        ) : (
          <div className="card mb-3">
            {/* Header */}
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <p className="mb-0 small text-muted">
                Return ID: {orderReturn.id}
              </p>
              {!returnState ? (
                <p className="mb-0 text-danger">N/A</p>
              ) : (
                <div className="d-flex align-items-center text-uppercase small">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-success text-decoration-none"
                    onClick={() => navigate(`return-refund/${orderReturn.id}`)}
                  >
                    <FontAwesomeIcon icon={faTruck} className="me-2" />
                    <span className="text-capitalize">{returnState.name}</span>
                  </button>
                  <FontAwesomeIcon
                    icon={faCircleQuestion}
                    className="ms-2 text-muted"
                    title={`Latest update time: ${
                      latestReturnState?.createdAt
                        ? new Date(latestReturnState.createdAt).toLocaleString()
                        : "N/A"
                    }`}
                  />
                  <span className="ms-2 border-start ps-2 fw-bold text-primary">
                    {returnStateDisplay.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Item list */}
            <Link
              to={`return-refund/${orderReturn.id}`}
              className="text-decoration-none text-dark"
            >
              <div className="card-body">
                {orderReturn.items.map((item, index) => (
                  <div
                    key={item.variation.id}
                    className={`pb-3 ${
                      index < orderReturn.items.length - 1
                        ? "mb-3 border-bottom"
                        : ""
                    }`}
                  >
                    <PurchaseItem
                      type="return"
                      item={item}
                      option={{ fadedForReturned: false }}
                    />
                  </div>
                ))}
              </div>
            </Link>

            {/* Footer */}
            <div className="card-footer bg-light-subtle">
              <p className="mb-4 text-end">
                Total Refund:{" "}
                <span className="fs-5 fw-bold text-primary">
                  {centsToUSD(orderReturn.refundSummary.finalRefundAmountCents)}
                </span>
              </p>
              <div className="d-flex justify-content-between align-items-center mb-2">
                {returnMsgDisplay && (
                  <p className="m-0 text-muted small">{returnMsgDisplay}</p>
                )}
                <div className="d-flex gap-3">
                  {canUpdate && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() =>
                          onCancelReturn(orderReturn.orderId, orderReturn.id)
                        }
                      >
                        Cancel Request
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() =>
                          navigate(`/return-refund/${orderReturn.id}/update`)
                        }
                      >
                        Edit Request
                      </button>
                    </>
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

export default ReturnCard;
