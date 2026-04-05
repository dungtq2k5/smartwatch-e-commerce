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
import { LOOKUP_ID } from "../../../../common/configs.common";

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
        case LOOKUP_ID.PAYMENT_STATE.PENDING:
          return { variant: "bg-warning text-dark", icon: faClock };
        case LOOKUP_ID.PAYMENT_STATE.PAID:
          return { variant: "bg-success", icon: faCheckCircle };
        case LOOKUP_ID.PAYMENT_STATE.FAILED:
          return { variant: "bg-danger", icon: faTimesCircle };
        case LOOKUP_ID.PAYMENT_STATE.REFUNDED_VIA_STRIPE:
          return { variant: "bg-info", icon: faMoneyBillTransfer };
        case LOOKUP_ID.PAYMENT_STATE.REFUNDED_TO_BALANCE:
          return { variant: "bg-info", icon: faMoneyBillTransfer };
        case LOOKUP_ID.PAYMENT_STATE.REFUND_VIA_STRIPE_FAILED:
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
