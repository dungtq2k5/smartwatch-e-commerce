import { memo } from "react";
import { Link, type LinkProps } from "react-router-dom";

export type LinkBtnProps = Readonly<{
  disabled?: boolean;
  disabledtitle?: string;
}> &
  LinkProps;

const LinkBtn = memo(
  ({
    className,
    title,
    disabledtitle,
    disabled = false,
    ...props
  }: LinkBtnProps) => {
    return (
      <Link
        {...props}
        className={`${className} ${disabled ? "disabled" : ""}`}
        title={disabled && disabledtitle ? disabledtitle : title}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
      />
    );
  }
);

export default LinkBtn;
