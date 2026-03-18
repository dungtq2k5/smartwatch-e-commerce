import { memo } from "react";
import type { PaymentStateResponse } from "../../../../common/types.common";
import { capFirstLetter } from "../../../../common/utils.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faCheckCircle,
  faTimesCircle,
  faMoneyBillTransfer,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

type PaymentStateBadgeProps = Readonly<{
  state?: PaymentStateResponse;
  className?: string;
}>;

const PaymentStateBadge = memo(
  ({ state, className = "" }: PaymentStateBadgeProps) => {
    if (!state) {
      return <span className={`badge bg-secondary ${className}`}>Unknown</span>;
    }

    // Color and icon scheme based on payment status
    const getBadgeConfig = (): { variant: string; icon?: IconDefinition } => {
      switch (state.lookupId) {
        case "1": // Pending
          return { variant: "bg-warning text-dark", icon: faClock };
        case "2": // Paid
          return { variant: "bg-success", icon: faCheckCircle };
        case "3": // Failed
          return { variant: "bg-danger", icon: faTimesCircle };
        case "4": // Refunded via Stripe
          return { variant: "bg-info", icon: faMoneyBillTransfer };
        case "5": // Refunded to Balance
          return { variant: "bg-info", icon: faMoneyBillTransfer };
        case "6": // Refund via Stripe Failed
          return { variant: "bg-danger", icon: faTimesCircle };
        default:
          return { variant: "bg-secondary" };
      }
    };

    const config = getBadgeConfig();

    return (
      <span
        className={`badge ${config.variant} ${className}`}
        title={state.description || undefined}
      >
        {config.icon && (
          <FontAwesomeIcon icon={config.icon} size="sm" className="me-1" />
        )}
        {capFirstLetter(state.name)}
      </span>
    );
  },
);

export default PaymentStateBadge;
