import { memo } from "react";
import type { PickupStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";

type OrderReturnPickupStateBadgeProps = Readonly<{
  state?: PickupStateResponse | null;
  className?: string;
}>;

const OrderReturnPickupStateBadge = memo(
  ({ state, className = "" }: OrderReturnPickupStateBadgeProps) => {
    if (!state) {
      return (
        <span className={`badge bg-secondary ${className}`}>
          {state === null ? "None" : "Unknown"}
        </span>
      );
    }

    // Color scheme based on pickup state lifecycle
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case "1": // Pending
          return "bg-warning text-dark";
        case "2": // Out For Pickup
          return "bg-info text-dark";
        case "3": // Picked Up
          return "bg-primary";
        case "4": // In Transit
          return "bg-primary";
        case "5": // Returned To Warehouse (Final)
          return "bg-success";
        case "6": // Pickup Failed
          return "bg-danger";
        case "7": // Pickup Rescheduled
          return "bg-warning text-dark";
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

export default OrderReturnPickupStateBadge;
