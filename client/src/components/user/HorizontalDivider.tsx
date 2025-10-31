import { memo } from "react";

const HorizontalDivider = memo(({ text }: { text?: string }) => {
  return (
    <div className="d-flex">
      <hr className="my-auto flex-grow-1" />
      {text && (
        <div className="px-2 text-muted">{text}</div>
      )}
      <hr className="my-auto flex-grow-1" />
    </div>
  );
});

export default HorizontalDivider;
