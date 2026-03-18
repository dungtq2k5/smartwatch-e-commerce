import { memo } from "react";
import type { PaymentMethodResponse } from "../../../../common/types.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStripe } from "@fortawesome/free-brands-svg-icons";
import {
  faMoneyBill,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { capFirstLetter } from "../../../../common/utils.common";

type PaymentMethodBadgeProps = Readonly<{
  method?: PaymentMethodResponse;
  className?: string;
  showIcon?: boolean;
  showName?: boolean;
}>;

const PaymentMethodBadge = memo(
  ({
    method,
    className = "",
    showIcon = true,
    showName = true,
  }: PaymentMethodBadgeProps) => {
    if (!method) {
      return <span className={`badge bg-secondary ${className}`}>Unknown</span>;
    }

    const getMethodConfig = (): {
      variant: string;
      icon?: IconDefinition;
    } => {
      switch (method.lookupId) {
        case "1": // COD (Cash on Delivery)
          return {
            variant: "bg-success-subtle text-success",
            icon: faMoneyBill,
          };
        case "2": // Stripe
          return {
            variant: "bg-primary-subtle text-primary",
            icon: faStripe,
          };
        default:
          return { variant: "bg-secondary" };
      }
    };

    const config = getMethodConfig();

    return (
      <span
        className={`badge ${config.variant} ${className}`}
        title={method.description || undefined}
      >
        {showIcon && config.icon && (
          <FontAwesomeIcon icon={config.icon} size="sm" className="me-1" />
        )}
        {showName && capFirstLetter(method.name)}
      </span>
    );
  },
);

export default PaymentMethodBadge;
