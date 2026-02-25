import { memo } from "react";
import type { DeliveryStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";

type DeliveryStateBadgeProps = Readonly<{
  state?: DeliveryStateResponse;
  className?: string;
}>;

const DeliveryStateBadge = memo(
  ({ state, className = "" }: DeliveryStateBadgeProps) => {
    if (!state) {
      return <span className={`badge bg-secondary ${className}`}>N/A</span>;
    }

    // Color scheme based on delivery flow progression
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case "1": // Pending
          return "bg-warning text-dark";
        case "2": // Processing
          return "bg-info text-dark";
        case "3": // Shipped
          return "bg-primary";
        case "4": // In Transit
          return "bg-primary";
        case "5": // Out for Delivery
          return "bg-success";
        case "6": // Delivered (Final - Success)
          return "bg-success";
        case "7": // Delivery Failed
          return "bg-danger";
        case "8": // Delivery Rescheduled (Back to pending)
          return "bg-warning text-dark";
        case "9": // Cancelled
          return "bg-dark";
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

export default DeliveryStateBadge;
