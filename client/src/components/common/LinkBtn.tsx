import { memo } from "react";
import { Link, type LinkProps } from "react-router-dom";

export type LinkBtnProps = Readonly<{
  disabled?: boolean;
  disabledTitle?: string;
}> &
  LinkProps;

const LinkBtn = memo(
  ({
    className,
    title,
    disabledTitle,
    disabled = false,
    ...props
  }: LinkBtnProps) => {
    return (
      <Link
        {...props}
        className={`${className} ${disabled ? "disabled" : ""}`}
        title={disabled && disabledTitle ? disabledTitle : title}
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
