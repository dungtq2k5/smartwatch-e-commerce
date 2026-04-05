import { memo } from "react";
import type { PickupStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";
import { LOOKUP_ID } from "../../../../common/configs.common";

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
        case LOOKUP_ID.PICKUP_STATE.PENDING:
          return "bg-warning text-dark";
        case LOOKUP_ID.PICKUP_STATE.OUT_FOR_PICKUP:
          return "bg-info text-dark";
        case LOOKUP_ID.PICKUP_STATE.PICKED_UP:
          return "bg-primary";
        case LOOKUP_ID.PICKUP_STATE.IN_TRANSIT_TO_WAREHOUSE:
          return "bg-primary";
        case LOOKUP_ID.PICKUP_STATE.RETURNED_TO_WAREHOUSE:
          return "bg-success";
        case LOOKUP_ID.PICKUP_STATE.PICKUP_FAILED:
          return "bg-danger";
        case LOOKUP_ID.PICKUP_STATE.PICKUP_RESCHEDULED:
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
