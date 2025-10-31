import { memo } from "react";

const SmallSpinner = memo(() => {
  return (
    <output className="spinner-border spinner-border-sm">
      <span className="visually-hidden">Loading...</span>
    </output>
  );
});

export default SmallSpinner;
