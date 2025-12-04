import { memo } from "react";
import HorizontalDivider from "../HorizontalDivider";
import { Placeholder } from "react-bootstrap";

const FilterSidebarSkeleton = memo(() => {
  return (
    <Placeholder
      as="div"
      animation="glow"
      className="border rounded-3 shadow-sm p-4"
      aria-hidden="true"
    >
      <h3 className="h5 mb-4">Filters</h3>
      <form>
        {/* Search input skeleton */}
        <div className="mb-3">
          <p className="form-label">Search</p>
          <div className="input-group">
            <Placeholder as="span" className="form-control" xs={12} />
          </div>
        </div>
        {/* Brand filter skeleton */}
        <div className="mb-3">
          <p className="form-label">Brand</p>
          <Placeholder
            as="span"
            className="form-select"
            style={{ height: "38px" }}
            xs={12}
          />
        </div>
        {/* Category filter skeleton */}
        <div className="mb-3">
          <p className="form-label">Category</p>
          <Placeholder
            as="span"
            className="form-select"
            style={{ height: "38px" }}
            xs={12}
          />
        </div>
        {/* Price range skeleton */}
        <div className="mb-3">
          <p className="form-label">Price Range</p>
          <Placeholder as="span" className="form-range" xs={12} />
        </div>
        <Placeholder.Button variant="primary" className="w-100" xs={12} />
        <div className="my-3">
          <HorizontalDivider />
        </div>
        <Placeholder.Button variant="danger" className="w-100" xs={12} />
      </form>
    </Placeholder>
  );
});

export default FilterSidebarSkeleton;
