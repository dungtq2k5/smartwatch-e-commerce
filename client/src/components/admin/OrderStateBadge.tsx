import { memo } from "react";
import type { OrderStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";
import { LOOKUP_ID } from "../../../../common/configs.common";

type OrderStateBadgeProps = Readonly<{
  state?: OrderStateResponse;
  className?: string;
}>;

const OrderStateBadge = memo(
  ({ state, className = "" }: OrderStateBadgeProps) => {
    if (!state) {
      return <span className={`badge bg-secondary ${className}`}>Unknown</span>;
    }

    // Color scheme based on order lifecycle
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case LOOKUP_ID.ORDER_STATE.PENDING:
          return "bg-warning text-dark";
        case LOOKUP_ID.ORDER_STATE.CONFIRMED:
          return "bg-info text-dark";
        case LOOKUP_ID.ORDER_STATE.PLACED:
          return "bg-primary";
        case LOOKUP_ID.ORDER_STATE.DELIVERING:
          return "bg-primary";
        case LOOKUP_ID.ORDER_STATE.DELIVERED:
          return "bg-success";
        case LOOKUP_ID.ORDER_STATE.COMPLETED:
          return "bg-success";
        case LOOKUP_ID.ORDER_STATE.CANCELLED:
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
