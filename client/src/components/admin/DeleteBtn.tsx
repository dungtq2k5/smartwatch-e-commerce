import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";

const DeleteBtn = memo(
  ({
    onClick,
    title,
  }: Readonly<{
    onClick: () => void;
    title: string;
  }>) => {
    return (
      <button
        type="button"
        className="btn btn-link text-white bg-danger"
        title={title}
        onClick={onClick}
      >
        <FontAwesomeIcon icon={faTrash} size="sm" />
      </button>
    );
  }
);

export default DeleteBtn;
