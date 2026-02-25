import { memo } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const Title = memo(
  ({
    title,
    parentTitle,
    parentLink,
    className = ""
  }: {
    title: React.ReactNode;
    parentTitle: string;
    parentLink: string;
    className?: string;
  }) => {
    return (
      <div className={`d-flex justify-content-between align-items-center ${className}`}>
        <h1 className="fs-2 mb-0 d-flex align-items-center gap-2">
          <Link to={parentLink} className="text-decoration-none text-dark">
            {parentTitle}
          </Link>
          <FontAwesomeIcon
            icon={faChevronRight}
            className="text-muted fs-5"
            style={{ opacity: 0.5 }}
          />
          <span>{title}</span>
        </h1>
      </div>
    );
  }
);

export default Title;
