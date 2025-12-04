import { faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";
import { Link } from "react-router-dom";

const EditBtnLink = memo(
  ({
    linkTo,
    title,
  }: Readonly<{
    linkTo: string;
    title: string;
  }>) => {
    return (
      <Link
        to={linkTo}
        className="btn btn-link text-white bg-primary"
        title={title}
      >
        <FontAwesomeIcon icon={faPen} size="sm" />
      </Link>
    );
  }
);

export default EditBtnLink;
