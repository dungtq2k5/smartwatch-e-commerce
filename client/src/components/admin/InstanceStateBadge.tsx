import { memo } from "react";
import { capFirstLetter } from "../../../../common/utils.common";
import type { InstanceState } from "../../../../common/types.common";

type InstanceStateBadgeProps = Readonly<{
  state: InstanceState;
  className?: string;
}>;

const InstanceStateBadge = memo(
  ({ state, className = "" }: InstanceStateBadgeProps) => {
    const getBadgeVariant = (): string => {
      switch (state) {
        case "ordered":
          return "bg-primary";
        case "return pending":
          return "bg-warning text-dark";
        case "returned":
          return "bg-info text-dark";
        case "return declined":
          return "bg-danger";
        case "cancelled":
          return "bg-secondary";
        default:
          return "bg-light text-dark";
      }
    };

    return (
      <span className={`badge ${getBadgeVariant()} ${className}`}>
        {capFirstLetter(state)}
      </span>
    );
  },
);

InstanceStateBadge.displayName = "InstanceStateBadge";

export default InstanceStateBadge;
