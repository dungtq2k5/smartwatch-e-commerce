import { faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";
import { Link } from "react-router-dom";

const EditBtnLink = memo(
  ({
    to,
    title,
  }: Readonly<{
    to: string;
    title: string;
  }>) => {
    return (
      <Link
        to={to}
        className="btn btn-link text-white bg-primary"
        title={title}
      >
        <FontAwesomeIcon icon={faPen} size="sm" />
      </Link>
    );
  }
);

export default EditBtnLink;
