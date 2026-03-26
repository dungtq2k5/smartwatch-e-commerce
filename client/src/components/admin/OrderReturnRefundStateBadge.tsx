import { memo } from "react";
import type { RefundStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";

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
        case "1": // Pending
          return "bg-warning text-dark";
        case "2": // Refunded Via Stripe
          return "bg-success";
        case "3": // Refunded To Balance
          return "bg-success";
        case "4": // Refund Via Stripe Failed
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
