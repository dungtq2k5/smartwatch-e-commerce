import { memo } from "react";
import type { RefundStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";
import { LOOKUP_ID } from "../../../../common/configs.common";

type OrderReturnRefundStateBadgeProps = Readonly<{
  state?: RefundStateResponse | null;
  className?: string;
}>;

const OrderReturnRefundStateBadge = memo(
  ({ state, className = "" }: OrderReturnRefundStateBadgeProps) => {
    if (!state) {
      return (
        <span className={`badge bg-secondary ${className}`}>
          {state === null ? "None" : "Unknown"}
        </span>
      );
    }

    // Color scheme based on refund state lifecycle
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case LOOKUP_ID.REFUND_STATE.PENDING:
          return "bg-warning text-dark";
        case LOOKUP_ID.REFUND_STATE.REFUNDED_VIA_STRIPE:
          return "bg-success";
        case LOOKUP_ID.REFUND_STATE.REFUNDED_TO_BALANCE:
          return "bg-success";
        case LOOKUP_ID.REFUND_STATE.REFUND_VIA_STRIPE_FAILED:
          return "bg-danger";
        default:
          return "bg-secondary";
      }
    };

    return (
      <span
        className={`badge ${getBadgeVariant()} ${className}`}
        title={state.description || undefined}
      >
        {capFirstLetter(state.name)}
      </span>
    );
  },
);

export default OrderReturnRefundStateBadge;
