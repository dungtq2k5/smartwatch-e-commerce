import { memo } from "react";

const ProductDetailSkeleton = memo(() => {
  // Generate static skeleton IDs to avoid index keys
  const thumbSkeletonIds = Array.from(
    { length: 4 },
    (_, i) => `thumb-skeleton-${Date.now()}-${i}`
  );
  const modelSkeletonIds = Array.from(
    { length: 3 },
    (_, i) => `model-skeleton-${Date.now()}-${i}`
  );
  const colorSkeletonIds = Array.from(
    { length: 4 },
    (_, i) => `color-skeleton-${Date.now()}-${i}`
  );

  return (
    <div className="row g-4">
      {/* Left: Images Skeleton */}
      <div className="col-lg-6">
        <div className="row g-3">
          {/* Vertical image selector skeleton */}
          <div className="col-12 col-md-2 order-2 order-md-1">
            <div className="d-flex flex-row flex-md-column gap-2">
              {thumbSkeletonIds.map((id) => (
                <div
                  key={id}
                  className="placeholder"
                  style={{
                    width: "4em",
                    height: "4em",
                    borderRadius: "0.375rem",
                  }}
                ></div>
              ))}
            </div>
          </div>
          {/* Main image skeleton */}
          <div className="col-12 col-md-10 order-1 order-md-2">
            <div
              className="placeholder shadow--g"
              style={{
                width: "100%",
                height: "30em",
                borderRadius: "0.5rem",
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Right: Info & Actions Skeleton */}
      <div className="col-lg-6">
        <div className="h-100 d-flex flex-column placeholder-glow">
          {/* Product title skeleton */}
          <div className="mb-2">
            <span
              className="placeholder col-10 h1"
              style={{ height: "2.5rem" }}
            ></span>
          </div>

          {/* Brand & Category skeleton */}
          <div className="mb-2">
            <span
              className="placeholder col-6"
              style={{ height: "1.2rem" }}
            ></span>
          </div>

          {/* Price skeleton */}
          <div className="mb-2">
            <span
              className="placeholder col-4"
              style={{ height: "2rem", fontSize: "1.75rem" }}
            ></span>
          </div>

          {/* Description skeleton */}
          <div className="mb-4">
            <span className="placeholder col-12"></span>
            <span className="placeholder col-11"></span>
            <span className="placeholder col-9"></span>
          </div>

          {/* Model/Variant selector skeleton */}
          <div className="mb-3">
            <h2 className="fs-6 fw-semibold mb-3">Model/Variant</h2>
            <div className="d-flex flex-wrap gap-2">
              {modelSkeletonIds.map((id) => (
                <span
                  key={id}
                  className="placeholder"
                  style={{
                    width: "6rem",
                    height: "2.5rem",
                    borderRadius: "4px",
                  }}
                ></span>
              ))}
            </div>
          </div>

          {/* Color picker skeleton */}
          <div className="mb-4">
            <h2 className="fs-6 fw-semibold mb-3">Color</h2>
            <div className="d-flex flex-wrap gap-2">
              {colorSkeletonIds.map((id) => (
                <span
                  key={id}
                  className="placeholder d-flex align-items-center"
                  style={{
                    width: "8rem",
                    height: "2.5rem",
                    borderRadius: "4px",
                  }}
                ></span>
              ))}
            </div>
          </div>

          {/* Specs button skeleton */}
          <div className="mb-4 text-end">
            <span
              className="placeholder col-3"
              style={{ height: "1.5rem" }}
            ></span>
          </div>

          {/* Purchase buttons skeleton */}
          <div className="mt-auto">
            <div className="d-grid gap-3">
              <span
                className="placeholder col-12"
                style={{ height: "2rem", borderRadius: "4px" }}
              ></span>
              <span
                className="placeholder col-12"
                style={{ height: "2rem", borderRadius: "18px" }}
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ProductDetailSkeleton.displayName = "ProductDetailSkeleton";

export default ProductDetailSkeleton;
