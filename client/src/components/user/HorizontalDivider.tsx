import { memo } from "react";

type HorizontalDividerProps = Readonly<
  Partial<{
    text: string;
    className: string;
  }>
>;

const HorizontalDivider = memo(
  ({ text, className }: HorizontalDividerProps) => {
    return (
      <div className={`d-flex ${className ?? ""}`}>
        <hr className="my-auto flex-grow-1" />
        {text && <div className="px-2 text-muted">{text}</div>}
        <hr className="my-auto flex-grow-1" />
      </div>
    );
  }
);

export default HorizontalDivider;
