import { memo } from "react";
import type { OrderStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";

type OrderStateBadgeProps = Readonly<{
  state?: OrderStateResponse;
  className?: string;
}>;

const OrderStateBadge = memo(
  ({ state, className = "" }: OrderStateBadgeProps) => {
    if (!state) {
      return <span className={`badge bg-secondary ${className}`}>N/A</span>;
    }

    // Color scheme based on order lifecycle
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case "1": // Pending (waiting for verification)
          return "bg-warning text-dark";
        case "2": // Confirmed (verified, ready for fulfillment)
          return "bg-info text-dark";
        case "3": // Placed (order is being processed)
          return "bg-primary";
        case "4": // Delivering (out for delivery)
          return "bg-primary";
        case "5": // Delivered (delivered to recipient)
          return "bg-success";
        case "6": // Completed (final state - confirmed by buyer)
          return "bg-success";
        case "7": // Cancelled
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

export default OrderStateBadge;
