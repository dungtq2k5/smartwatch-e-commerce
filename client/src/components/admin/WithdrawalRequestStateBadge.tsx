import { memo } from "react";
import type { WithdrawalStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";
import { LOOKUP_ID } from "../../../../common/configs.common";

type WithdrawalRequestStateBadgeProps = Readonly<{
  state?: WithdrawalStateResponse | null;
  className?: string;
}>;

const WithdrawalRequestStateBadge = memo(
  ({ state, className = "" }: WithdrawalRequestStateBadgeProps) => {
    if (!state) {
      return (
        <span className={`badge bg-secondary ${className}`}>
          {state === null ? "None" : "Unknown"}
        </span>
      );
    }

    // Color scheme based on withdrawal request lifecycle
    const getBadgeVariant = (): string => {
      switch (state.lookupId) {
        case LOOKUP_ID.WITHDRAWAL_STATE.PENDING:
          return "bg-warning text-dark";
        case LOOKUP_ID.WITHDRAWAL_STATE.APPROVED:
          return "bg-info text-dark";
        case LOOKUP_ID.WITHDRAWAL_STATE.PROCESSING:
          return "bg-primary";
        case LOOKUP_ID.WITHDRAWAL_STATE.COMPLETED:
          return "bg-success";
        case LOOKUP_ID.WITHDRAWAL_STATE.FAILED:
          return "bg-danger";
        case LOOKUP_ID.WITHDRAWAL_STATE.CANCELLED:
          return "bg-secondary";
        case LOOKUP_ID.WITHDRAWAL_STATE.REJECTED:
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

WithdrawalRequestStateBadge.displayName = "WithdrawalRequestStateBadge";
export default WithdrawalRequestStateBadge;
