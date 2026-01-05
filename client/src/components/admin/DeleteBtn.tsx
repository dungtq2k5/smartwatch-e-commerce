import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo, type ComponentPropsWithoutRef } from "react";

type DeleteBtnProps = Readonly<{
  disabledtitle?: string;
}> &
  ComponentPropsWithoutRef<"button">;

const DeleteBtn = memo(({ children, ...props }: DeleteBtnProps) => {
  return (
    <button
      {...props}
      type={props.type || "button"}
      className={`btn btn-link text-white bg-danger ${props.className}`}
      title={
        props.disabled && props.disabledtitle
          ? props.disabledtitle
          : props.title
      }
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <FontAwesomeIcon icon={faTrash} size="sm" />
      {children}
    </button>
  );
});

export default DeleteBtn;
