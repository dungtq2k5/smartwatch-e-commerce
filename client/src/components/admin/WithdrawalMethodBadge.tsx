import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faBuildingColumns,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { capFirstLetter } from "../../../../common/utils.common";
import type { WITHDRAWAL_METHODS } from "../../../../common/configs.common";

type WithdrawalMethodBadgeProps = Readonly<{
  method?: (typeof WITHDRAWAL_METHODS)[number] | null;
  className?: string;
  showIcon?: boolean;
  showName?: boolean;
}>;

const WithdrawalMethodBadge = memo(
  ({
    method,
    className = "",
    showIcon = true,
    showName = true,
  }: WithdrawalMethodBadgeProps) => {
    if (!method) {
      return (
        <span className={`badge bg-secondary ${className}`}>
          {method === null ? "None" : "Unknown"}
        </span>
      );
    }

    const getMethodConfig = (): {
      variant: string;
      icon?: IconDefinition;
    } => {
      switch (method) {
        case "bank_transfer":
          return {
            variant: "bg-primary-subtle text-primary",
            icon: faBuildingColumns,
          };
        case "card":
          return {
            variant: "bg-info-subtle text-info",
            icon: faCreditCard,
          };
        default:
          return { variant: "bg-secondary" };
      }
    };

    const config = getMethodConfig();

    return (
      <span className={`badge ${config.variant} ${className}`}>
        {showIcon && config.icon && (
          <FontAwesomeIcon icon={config.icon} size="sm" className="me-1" />
        )}
        {showName && capFirstLetter(method.replace("_", " "))}
      </span>
    );
  },
);

WithdrawalMethodBadge.displayName = "WithdrawalMethodBadge";
export default WithdrawalMethodBadge;
