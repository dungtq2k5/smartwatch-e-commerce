import { memo } from "react";
import HorizontalDivider from "../HorizontalDivider";

const FilterSidebarSkeleton = memo(() => {
  return (
    <div className="border rounded-3 shadow-sm p-4" aria-hidden="true">
      <h3 className="h5 mb-4">Filters</h3>
      <form>
        {/* Search input skeleton */}
        <div className="mb-3 placeholder-glow">
          <p className="form-label">Search</p>
          <div className="input-group">
            <span className="form-control placeholder col-12"></span>
          </div>
        </div>
        {/* Brand filter skeleton */}
        <div className="mb-3 placeholder-glow">
          <p className="form-label">Brand</p>
          <span className="form-select placeholder col-12"></span>
        </div>
        {/* Category filter skeleton */}
        <div className="mb-3 placeholder-glow">
          <p className="form-label">Category</p>
          <span className="form-select placeholder col-12"></span>
        </div>
        {/* Price range skeleton */}
        <div className="mb-3 placeholder-glow">
          <p className="form-label">Price Range</p>
          <span className="form-range placeholder col-12"></span>
        </div>
        <span className="btn btn-primary w-100 disabled placeholder col-12"></span>
        <div className="my-3">
          <HorizontalDivider />
        </div>
        <span className="btn btn-danger w-100 disabled placeholder col-12"></span>
      </form>
    </div>
  );
});

export default FilterSidebarSkeleton;
