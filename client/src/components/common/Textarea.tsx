import { memo } from "react";
import InvalidInputMsg from "./InvalidInputMsg";
import type { CustomInputProps } from "../../utils/types";

type TextareaProps = CustomInputProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = memo(({ error, className, ...props }: TextareaProps) => {
  return (
    <>
      <textarea
        {...props}
        className={`${className || ""} ${(props.required || error) && (!props.value || error) ? "is-invalid" : ""}`}
      />
      {error && <InvalidInputMsg msg={error} />}
    </>
  );
});

export default Textarea;
