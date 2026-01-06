import { memo, type JSX } from "react";

export type BtnProps = Readonly<{
  loading?: boolean;
  icon?: JSX.Element;
}> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

const Btn = memo(({ loading, icon, children, ...props }: BtnProps) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          <output>{children}</output>
        </>
      ) : (
        <>
          {icon && <span className="me-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
});

export default Btn;
