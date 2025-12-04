import { memo } from "react";
import HorizontalDivider from "../HorizontalDivider";
import { Placeholder } from "react-bootstrap";

const CartSkeleton = memo(() => {
  const cartItemSkeletonIds = Array.from(
    { length: 3 },
    (_, i) => `cart-item-skeleton-${i}`
  );

  return (
    <div className="container py-4 w-100">
      {/* Title skeleton */}
      <Placeholder as="div" animation="glow" className="mb-4 text-center">
        <Placeholder as="span" className="h1" xs={4} />
      </Placeholder>

      <div className="row g-4">
        {/* Left column: Cart items skeleton */}
        <div className="col-lg-8">
          <Placeholder
            as="div"
            animation="glow"
            className="d-flex flex-column gap-3"
          >
            {cartItemSkeletonIds.map((id) => (
              <div className="card shadow-sm" key={id}>
                <div className="card-body">
                  <div className="row g-3">
                    {/* Image skeleton */}
                    <div className="col-md-3">
                      <Placeholder className="cart-item-img--g img-fluid rounded" />
                    </div>
                    {/* Info skeleton */}
                    <div className="col-md-9">
                      <div className="d-flex justify-content-between">
                        <div className="w-100">
                          <Placeholder as="p" className="card-title h5 mb-1">
                            <Placeholder xs={8} />
                          </Placeholder>
                          <Placeholder
                            as="p"
                            className="card-text small text-muted mb-2 d-flex align-items-center"
                          >
                            <Placeholder
                              className="me-1"
                              style={{ width: "1.5rem", height: "1.5rem" }}
                            />
                            <Placeholder xs={6} />
                          </Placeholder>
                          <Placeholder as="p" className="card-text fw-bold">
                            <Placeholder xs={4} />
                          </Placeholder>
                        </div>
                        <div>
                          <Placeholder
                            style={{ width: "24px", height: "24px" }}
                          />
                        </div>
                      </div>
                      <div className="d-flex align-items-center mt-2">
                        <Placeholder xs={2} className="me-2" />
                        <Placeholder
                          style={{
                            width: "70px",
                            height: "31px",
                            borderRadius: "0.25rem",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Placeholder>
        </div>

        {/* Right column: Summary card skeleton */}
        <div className="col-lg-4">
          <div
            className="card shadow-sm position-sticky"
            style={{ top: "1rem" }}
          >
            <Placeholder as="div" animation="glow" className="card-body">
              <Placeholder as="h2" className="h4 card-title mb-3">
                <Placeholder xs={6} />
              </Placeholder>
              <div className="d-flex justify-content-between mb-2">
                <span className="w-100">
                  <Placeholder xs={4} />
                </span>
                <span className="w-100">
                  <Placeholder xs={4} />
                </span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold w-100">
                  <Placeholder xs={5} />
                </span>
                <span className="fw-bold w-100">
                  <Placeholder xs={4} />
                </span>
              </div>
              <Placeholder as="p" className="small text-muted mb-3">
                <Placeholder xs={12} />
              </Placeholder>
              <div className="d-grid gap-2">
                <Placeholder style={{ height: "2rem", borderRadius: "18px" }} />
                <HorizontalDivider text="or" />
                <div className="text-center">
                  <Placeholder xs={5} />
                </div>
              </div>
            </Placeholder>
          </div>
        </div>
      </div>
    </div>
  );
});

CartSkeleton.displayName = "CartSkeleton";

export default CartSkeleton;
