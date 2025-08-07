import { memo } from "react";
import HorizontalDivider from "../HorizontalDivider";

const CartSkeleton = memo(() => {
  const cartItemSkeletonIds = Array.from(
    { length: 3 },
    (_, i) => `cart-item-skeleton-${i}`
  );

  return (
    <div className="container py-4 w-100">
      {/* Title skeleton */}
      <div className="mb-4 placeholder-glow text-center">
        <span className="placeholder col-4 h1"></span>
      </div>

      <div className="row g-4">
        {/* Left column: Cart items skeleton */}
        <div className="col-lg-8">
          <div className="d-flex flex-column gap-3 placeholder-glow">
            {cartItemSkeletonIds.map((id) => (
              <div className="card shadow-sm" key={id}>
                <div className="card-body">
                  <div className="row g-3">
                    {/* Image skeleton */}
                    <div className="col-md-3">
                      <div className="placeholder cart-item-img--g img-fluid rounded"></div>
                    </div>
                    {/* Info skeleton */}
                    <div className="col-md-9">
                      <div className="d-flex justify-content-between">
                        <div className="w-100">
                          <p className="card-title h5 mb-1">
                            <span className="placeholder col-8"></span>
                          </p>
                          <p className="card-text small text-muted mb-2 d-flex align-items-center">
                            <span
                              className="placeholder me-1"
                              style={{ width: "1.5rem", height: "1.5rem" }}
                            ></span>
                            <span className="placeholder col-6"></span>
                          </p>
                          <p className="card-text fw-bold">
                            <span className="placeholder col-4"></span>
                          </p>
                        </div>
                        <div>
                          <span
                            className="placeholder"
                            style={{ width: "24px", height: "24px" }}
                          ></span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center mt-2">
                        <span className="placeholder col-2 me-2"></span>
                        <span
                          className="placeholder"
                          style={{
                            width: "70px",
                            height: "31px",
                            borderRadius: "0.25rem",
                          }}
                        ></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Summary card skeleton */}
        <div className="col-lg-4">
          <div
            className="card shadow-sm position-sticky"
            style={{ top: "1rem" }}
          >
            <div className="card-body placeholder-glow">
              <h2 className="h4 card-title mb-3">
                <span className="placeholder col-6"></span>
              </h2>
              <div className="d-flex justify-content-between mb-2">
                <span className="w-100">
                  <span className="placeholder col-4"></span>
                </span>
                <span className="w-100">
                  <span className="placeholder col-4"></span>
                </span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold w-100">
                  <span className="placeholder col-5"></span>
                </span>
                <span className="fw-bold w-100">
                  <span className="placeholder col-4"></span>
                </span>
              </div>
              <p className="small text-muted mb-3">
                <span className="placeholder col-12"></span>
              </p>
              <div className="d-grid gap-2">
                <span
                  className="placeholder"
                  style={{ height: "2rem", borderRadius: "18px" }}
                ></span>
                <HorizontalDivider text="or" />
                <div className="text-center">
                  <span className="placeholder col-5"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CartSkeleton.displayName = "CartSkeleton";

export default CartSkeleton;
