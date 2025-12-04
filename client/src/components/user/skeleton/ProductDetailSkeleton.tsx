import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const ProductDetailSkeleton = memo(() => {
  // Generate static skeleton IDs to avoid index keys
  const thumbSkeletonIds = Array.from(
    { length: 4 },
    (_, i) => `thumb-skeleton-${i}`
  );
  const modelSkeletonIds = Array.from(
    { length: 3 },
    (_, i) => `model-skeleton-${i}`
  );
  const colorSkeletonIds = Array.from(
    { length: 4 },
    (_, i) => `color-skeleton-${i}`
  );

  return (
    <div className="row g-4">
      {/* Left: Images Skeleton */}
      <div className="col-lg-6">
        <div className="row g-3">
          {/* Vertical image selector skeleton */}
          <div className="col-12 col-md-2 order-2 order-md-1">
            <Placeholder
              as="div"
              animation="glow"
              className="d-flex flex-row flex-md-column gap-2"
            >
              {thumbSkeletonIds.map((id) => (
                <Placeholder
                  key={id}
                  style={{
                    width: "4em",
                    height: "4em",
                    borderRadius: "0.375rem",
                  }}
                />
              ))}
            </Placeholder>
          </div>
          {/* Main image skeleton */}
          <div className="col-12 col-md-10 order-1 order-md-2">
            <Placeholder as="div" animation="glow">
              <Placeholder
                className="shadow--g"
                style={{
                  width: "100%",
                  height: "30em",
                  borderRadius: "0.5rem",
                }}
              />
            </Placeholder>
          </div>
        </div>
      </div>

      {/* Right: Info & Actions Skeleton */}
      <div className="col-lg-6">
        <Placeholder
          as="div"
          animation="glow"
          className="h-100 d-flex flex-column"
        >
          {/* Product title skeleton */}
          <div className="mb-2">
            <Placeholder
              as="span"
              className="h1"
              xs={10}
              style={{ height: "2.5rem" }}
            />
          </div>

          {/* Brand & Category skeleton */}
          <div className="mb-2">
            <Placeholder as="span" xs={6} style={{ height: "1.2rem" }} />
          </div>

          {/* Price skeleton */}
          <div className="mb-2">
            <Placeholder
              as="span"
              xs={4}
              style={{ height: "2rem", fontSize: "1.75rem" }}
            />
          </div>

          {/* Description skeleton */}
          <div className="mb-4">
            <Placeholder as="p" className="mb-1">
              <Placeholder xs={12} />
            </Placeholder>
            <Placeholder as="p" className="mb-1">
              <Placeholder xs={11} />
            </Placeholder>
            <Placeholder as="p" className="mb-0">
              <Placeholder xs={9} />
            </Placeholder>
          </div>

          {/* Model/Variant selector skeleton */}
          <div className="mb-3">
            <h2 className="fs-6 fw-semibold mb-3">Model/Variant</h2>
            <div className="d-flex flex-wrap gap-2">
              {modelSkeletonIds.map((id) => (
                <Placeholder.Button
                  key={id}
                  style={{
                    width: "6rem",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Color picker skeleton */}
          <div className="mb-4">
            <h2 className="fs-6 fw-semibold mb-3">Color</h2>
            <div className="d-flex flex-wrap gap-2">
              {colorSkeletonIds.map((id) => (
                <Placeholder.Button
                  key={id}
                  className="d-flex align-items-center"
                  style={{
                    width: "8rem",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Specs button skeleton */}
          <div className="mb-4 text-end">
            <Placeholder as="span" xs={3} style={{ height: "1.5rem" }} />
          </div>

          {/* Purchase buttons skeleton */}
          <div className="mt-auto">
            <div className="d-grid gap-3">
              <Placeholder.Button
                variant="outline-primary"
                style={{ height: "2.5rem" }}
              />
              <Placeholder.Button
                variant="dark"
                style={{ height: "2.5rem", borderRadius: "18px" }}
              />
            </div>
          </div>
        </Placeholder>
      </div>
    </div>
  );
});

ProductDetailSkeleton.displayName = "ProductDetailSkeleton";

export default ProductDetailSkeleton;
