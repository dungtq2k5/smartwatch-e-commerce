import { faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";

const TableHeadSortBtn = memo(
  ({
    label,
    isAsc,
    isDesc,
    onClick,
  }: Readonly<{
    label: string;
    isAsc: boolean;
    isDesc: boolean;
    onClick: () => void;
  }>) => {
    return (
      <button
        type="button"
        className="btn border-0 p-0 fw-bold"
        title={
          isAsc
            ? "ascending"
            : isDesc
            ? "descending"
            : `sort by ${label.toLowerCase()}`
        }
        onClick={onClick}
      >
        {label}
        {isAsc ? (
          <FontAwesomeIcon icon={faSortUp} size="sm" className="ms-2" />
        ) : (
          isDesc && (
            <FontAwesomeIcon icon={faSortDown} size="sm" className="ms-2" />
          )
        )}
      </button>
    );
  }
);

export default TableHeadSortBtn;
