import { memo, forwardRef } from "react";
import InvalidInputMsg from "./InvalidInputMsg";
import type { CustomInputProps } from "../../utils/types";

// Exclude the strict HTML 'value' type and define a broader one that accepts File | null
type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"> &
  CustomInputProps & {
    value?: string | number | readonly string[] | File | null;
  };

const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(
    (
      { error, className = "", value, neverShowErrorMessage = false, ...props },
      ref,
    ) => {
      // DOM Props Logic (prepares props for the actual <input>)
      // Cast to InputHTMLAttributes to satisfy TS when we re-add compatible properties
      const domProps = {
        ...props,
      } as React.InputHTMLAttributes<HTMLInputElement>;

      // logic: Only pass 'value' to the DOM if it is NOT a file input.
      if (props.type !== "file") {
        // Safety check: Don't pass a File object to a text input's value attribute
        if (!(value instanceof File)) {
          domProps.value = value as
            | string
            | number
            | readonly string[]
            | undefined;
        }
      }

      return (
        <>
          <input
            ref={ref}
            {...domProps}
            className={`${className} ${
              (props.required || error) && (!value || error) ? "is-invalid" : ""
            }`}
          />
          {!neverShowErrorMessage && error && <InvalidInputMsg msg={error} />}
        </>
      );
    },
  ),
);

export default Input;
