import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const PurchaseDetailSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" aria-hidden="true">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
        <Placeholder xs={2} />
        <Placeholder xs={4} />
      </div>

      {/* Order Info */}
      <div className="border-bottom pb-4 mb-4">
        <Placeholder as="h2" className="fs-4 mb-4">
          <Placeholder xs={3} />
        </Placeholder>
        {/* Progress bar */}
        <div className="row justify-content-center mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="col text-center progress-step">
              <Placeholder className="progress-step-icon" />
              <Placeholder as="p" className="mt-2 mb-0">
                <Placeholder xs={8} />
              </Placeholder>
            </div>
          ))}
        </div>
        {/* Delivery address and states */}
        <div className="d-flex gap-3">
          <div className="bg-light p-3 rounded w-100 h-100">
            <Placeholder as="h3" className="fs-5 fw-semibold mb-3">
              <Placeholder xs={5} />
            </Placeholder>
            <div>
              <Placeholder as="p" className="fw-bold mb-1">
                <Placeholder xs={4} />
              </Placeholder>
              <Placeholder as="p" className="text-muted mb-1">
                <Placeholder xs={3} />
              </Placeholder>
              <Placeholder as="p" className="text-muted mb-0">
                <Placeholder xs={8} />
              </Placeholder>
            </div>
          </div>
          <div className="bg-light p-3 rounded w-100 h-100">
            <div className="mb-3">
              <Placeholder as="h3" className="fs-5 fw-semibold">
                <Placeholder xs={6} />
              </Placeholder>
              <Placeholder xs={7} />
            </div>
            <ul className="list-unstyled">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="mb-2">
                  <Placeholder as="p" className="mb-0">
                    <Placeholder xs={10} />
                  </Placeholder>
                  <Placeholder as="p" className="text-muted small mb-0">
                    <Placeholder xs={8} />
                  </Placeholder>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Items and summary */}
      <div>
        <Placeholder as="h2" className="fs-4 mb-3">
          <Placeholder xs={2} />
        </Placeholder>
        <div className="row">
          <div className="col-lg-8">
            <div className="d-flex gap-3">
              <Placeholder
                className="purchase-item-img--g rounded"
                style={{ width: "4em", height: "4em" }}
              />
              <div className="flex-grow-1">
                <Placeholder as="p" className="mb-1 fw-semibold">
                  <Placeholder xs={10} />
                </Placeholder>
                <Placeholder as="div" className="small text-muted mb-2">
                  <Placeholder xs={5} />
                </Placeholder>
                <div className="d-flex justify-content-between">
                  <Placeholder xs={3} />
                  <Placeholder xs={2} />
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <Placeholder as="h3" className="fs-5 fw-semibold mb-3">
                  <Placeholder xs={7} />
                </Placeholder>
                <div className="d-flex justify-content-between mb-2">
                  <Placeholder xs={4} />
                  <Placeholder xs={3} />
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                  <Placeholder xs={3} />
                  <Placeholder xs={4} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

export default PurchaseDetailSkeleton;
