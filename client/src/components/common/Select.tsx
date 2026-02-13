import { memo } from "react";
import InvalidInputMsg from "./InvalidInputMsg";
import type { CustomInputProps } from "../../utils/types";

type SelectProps = CustomInputProps &
  React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = memo(
  ({ error, neverShowErrorMessage, className, ...props }: SelectProps) => {
    return (
      <>
        <select
          {...props}
          className={`${className || ""} ${
            (props.required || error) && (!props.value || error)
              ? "is-invalid"
              : ""
          }`}
        />
        {!neverShowErrorMessage && error && <InvalidInputMsg msg={error} />}
      </>
    );
  },
);

export default Select;
