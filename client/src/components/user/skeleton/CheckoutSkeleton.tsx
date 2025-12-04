import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const CheckoutSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="row">
      {/* Left column skeleton */}
      <div className="col-md-8">
        {/* Delivery address card skeleton */}
        <div className="card shadow--g mb-4">
          <div className="card-header bg-white py-3">
            <Placeholder xs={4} style={{ height: "1.5rem" }} />
          </div>
          <div className="card-body">
            <Placeholder xs={10} />
          </div>
        </div>

        {/* Payment method card skeleton */}
        <div className="card shadow--g">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div className="h5 mb-0 w-50">
              <Placeholder xs={6} style={{ height: "1.5rem" }} />
            </div>
            <div className="d-flex gap-2">
              <Placeholder style={{ width: "60px", height: "31px" }} />
              <Placeholder style={{ width: "60px", height: "31px" }} />
            </div>
          </div>
          <div className="card-body">
            <Placeholder xs={12} />
          </div>
        </div>
      </div>

      {/* Right column skeleton */}
      <div className="col-md-4">
        <div className="card shadow--g">
          <div className="card-header bg-white py-3">
            <Placeholder xs={6} style={{ height: "1.5rem" }} />
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <Placeholder xs={4} />
              <Placeholder xs={3} />
            </div>
            <div className="d-flex justify-content-between mb-2">
              <Placeholder xs={4} />
              <Placeholder xs={2} />
            </div>
            <div className="d-flex justify-content-between mb-3">
              <Placeholder xs={5} />
              <Placeholder xs={2} />
            </div>
            <hr />
            <div className="d-flex justify-content-between h5 mb-4">
              <Placeholder xs={5} />
              <Placeholder xs={3} />
            </div>
            <Placeholder xs={12} style={{ height: "48px" }} />
          </div>
          <ul className="list-group list-group-flush">
            {[...Array(2)].map((_, index) => (
              <li
                key={index}
                className="list-group-item d-flex align-items-center"
              >
                <Placeholder
                  className="me-3"
                  style={{ width: "60px", height: "60px" }}
                />
                <div className="flex-grow-1">
                  <Placeholder as="span" xs={8} className="d-block mb-1" />
                  <Placeholder as="span" xs={6} className="d-block mb-1" />
                  <Placeholder as="span" xs={4} className="d-block" />
                </div>
                <div className="text-end w-25">
                  <Placeholder xs={12} />
                </div>
              </li>
            ))}
          </ul>
          <div className="card-footer bg-white text-center">
            <Placeholder xs={3} />
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

export default CheckoutSkeleton;
