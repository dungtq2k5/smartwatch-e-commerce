import { memo, useCallback, useMemo } from "react";

const Pagination = memo(
  ({
    totalItems,
    itemsPerPage, // limit
    currentOffset, // offset
    onOffsetChange,
  }: Readonly<{
    totalItems: number;
    itemsPerPage: number;
    currentOffset: number;
    onOffsetChange: (offset: number) => void;
  }>) => {
    // DEV temp for testing
    // const count = useRef(0);
    // count.current += 1;
    // console.log(
    //   `Pagination rendered ${count.current} times with offset: ${currentOffset}, itemsPerPage: ${itemsPerPage}, totalItems: ${totalItems}`
    // );

    const totalPages =
      itemsPerPage > 0 ? Math.ceil(totalItems / itemsPerPage) : 0;
    const currentPage =
      itemsPerPage > 0 ? Math.floor(currentOffset / itemsPerPage) + 1 : 1;

    const handlePageChange = useCallback(
      (page: number) => {
        const newOffset = (page - 1) * itemsPerPage;
        onOffsetChange(newOffset);
      },
      [itemsPerPage, onOffsetChange]
    );

    const paginationRange = useMemo(() => {
      const delta = 1; // Pages to show around the current page
      const range = [];

      for (
        let i = Math.max(2, currentPage - delta);
        i <= Math.min(totalPages - 1, currentPage + delta);
        i++
      ) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        range.unshift("...");
      }
      if (currentPage + delta < totalPages - 1) {
        range.push("...");
      }

      range.unshift(1);
      if (totalPages > 1) {
        range.push(totalPages);
      }

      // Remove duplicates if totalPages is small
      return [...new Set(range)];
    }, [totalPages, currentPage]);

    if (totalPages <= 1) {
      return null;
    }

    return (
      <nav aria-label="Page navigation">
        <ul className="pagination mb-0">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Previous"
            >
              <span aria-hidden="true">&laquo;</span>
            </button>
          </li>
          {paginationRange.map((page, idx) => {
            const isCurrent = page === currentPage;
            if (page === "...") {
              return (
                <li key={`ellipsis-${idx+1}`} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              );
            }
            return (
              <li
                key={page}
                className={`page-item ${isCurrent ? "active" : ""}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page as number)}
                >
                  {page}
                </button>
              </li>
            );
          })}
          <li
            className={`page-item ${
              currentPage === totalPages ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Next"
            >
              <span aria-hidden="true">&raquo;</span>
            </button>
          </li>
        </ul>
      </nav>
    );
  }
);

export default Pagination;
