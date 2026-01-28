import { memo } from "react";

type LabelProps = {
  required?: boolean;
} & React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = memo(({ required, children, ...props }: LabelProps) => {
  return (
    <label {...props}>
      {children} {required && <span className="text-danger">*</span>}
    </label>
  );
});

export default Label;
