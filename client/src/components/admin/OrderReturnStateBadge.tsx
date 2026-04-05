import { memo } from "react";
import type { ReturnStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";
import { LOOKUP_ID } from "../../../../common/configs.common";

type OrderReturnStateBadgeProps = Readonly<{
  state?: ReturnStateResponse | null;
  className?: string;
}>;

const OrderReturnStateBadge = memo(
  ({ state, className = "" }: OrderReturnStateBadgeProps) => {
    if (!state) {
      return (
        <span className={`badge bg-secondary ${className}`}>
          {state === null ? "None" : "Unknown"}
        </span>
      );
    }

    // Color scheme based on return state lifecycle
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case LOOKUP_ID.RETURN_STATE.PENDING_APPROVAL:
          return "bg-warning text-dark";
        case LOOKUP_ID.RETURN_STATE.APPROVED: // Approved
          return "bg-info text-dark";
        case "3": // Items Returning
          return "bg-primary";
        case "4": // Items Returned
          return "bg-primary";
        case "5": // Refunding
          return "bg-success";
        case "6": // Refunded (Final)
          return "bg-success";
        case "7": // Cancelled
          return "bg-danger";
        case "8": // Declined
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

export default OrderReturnStateBadge;
