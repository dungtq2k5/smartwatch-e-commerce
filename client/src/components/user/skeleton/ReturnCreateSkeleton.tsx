import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const ReturnCreateSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" aria-hidden="true">
      <Placeholder as="h1" className="mb-4 fw-semibold text-center">
        <Placeholder xs={4} style={{ width: "100%" }} />
      </Placeholder>

      <div className="row g-4">
        {/* Left Column */}
        <div className="col-lg-8">
          <div className="d-flex flex-column gap-4">
            {/* Select items */}
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <Placeholder as="h2" className="h5 mb-0">
                  <Placeholder xs={4} />
                </Placeholder>
              </div>
              <div className="card-body">
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex gap-3">
                      <Placeholder className="purchase-item-img--g rounded" />
                      <div className="flex-grow-1">
                        <Placeholder
                          as="p"
                          className="fw-semibold mb-1"
                          xs={10}
                        />
                        <Placeholder
                          as="div"
                          className="small text-muted mb-2"
                          xs={5}
                        />
                        <div className="form-check">
                          <Placeholder
                            as="input"
                            type="checkbox"
                            className="form-check-input"
                          />
                          <Placeholder as="label" className="form-check-label">
                            <Placeholder xs={7} />
                          </Placeholder>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason for return */}
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <Placeholder as="h2" className="h5 mb-0">
                  <Placeholder xs={5} />
                </Placeholder>
              </div>
              <div className="card-body">
                <Placeholder
                  as="div"
                  className="form-select"
                  style={{ height: "38px" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
          <div
            className="card shadow-sm position-sticky"
            style={{ top: "1rem" }}
          >
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="h5 mb-0">
                <Placeholder xs={8} />
              </Placeholder>
            </div>
            <div className="card-body">
              <Placeholder xs={12} style={{ height: "100px" }} />
              <hr />
              <Placeholder as="div" className="form-control" />
            </div>
            <div className="card-footer d-flex gap-2">
              <Placeholder.Button variant="primary" className="w-50" xs={6} />
              <Placeholder.Button variant="secondary" className="w-50" xs={6} />
            </div>
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

export default ReturnCreateSkeleton;
