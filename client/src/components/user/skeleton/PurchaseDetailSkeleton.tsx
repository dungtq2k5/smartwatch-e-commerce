import { memo } from "react";

const PurchaseDetailSkeleton = memo(() => {
  return (
    <div aria-hidden="true">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4 placeholder-glow">
        <span className="placeholder col-2"></span>
        <span className="placeholder col-4"></span>
      </div>

      {/* Order Info */}
      <div className="border-bottom pb-4 mb-4 placeholder-glow">
        <h2 className="fs-4 mb-4 placeholder col-3"></h2>
        {/* Progress bar */}
        <div className="row justify-content-center mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="col text-center progress-step">
              <div className="progress-step-icon placeholder"></div>
              <p className="mt-2 mb-0 placeholder col-8"></p>
            </div>
          ))}
        </div>
        {/* Delivery address and states */}
        <div className="d-flex gap-3">
          <div className="bg-light p-3 rounded w-100 h-100">
            <h3 className="fs-5 fw-semibold mb-3 placeholder col-5"></h3>
            <div>
              <p className="fw-bold mb-1 placeholder col-4"></p>
              <p className="text-muted mb-1 placeholder col-3"></p>
              <p className="text-muted mb-0 placeholder col-8"></p>
            </div>
          </div>
          <div className="bg-light p-3 rounded w-100 h-100">
            <div className="mb-3">
              <h3 className="fs-5 fw-semibold placeholder col-6"></h3>
              <span className="placeholder col-7"></span>
            </div>
            <ul className="list-unstyled">
              {Array.from({ length: 2 }).map((_, i) => (
                <li key={i} className="mb-2">
                  <p className="mb-0 placeholder col-10"></p>
                  <p className="text-muted small mb-0 placeholder col-8"></p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Items and summary */}
      <div className="placeholder-glow">
        <h2 className="fs-4 mb-3 placeholder col-2"></h2>
        <div className="row">
          <div className="col-lg-8">
            <div className="d-flex gap-3">
              <div
                className="placeholder purchase-item-img--g rounded"
                style={{ width: "4em", height: "4em" }}
              ></div>
              <div className="flex-grow-1">
                <p className="mb-1 fw-semibold placeholder col-10"></p>
                <div className="small text-muted mb-2 placeholder col-5"></div>
                <div className="d-flex justify-content-between">
                  <span className="placeholder col-3"></span>
                  <span className="placeholder col-2"></span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 bg-light">
              <div className="card-body">
                <h3 className="fs-5 fw-semibold mb-3 placeholder col-7"></h3>
                <div className="d-flex justify-content-between mb-2">
                  <span className="placeholder col-4"></span>
                  <span className="placeholder col-3"></span>
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold fs-5 mb-3">
                  <span className="placeholder col-3"></span>
                  <span className="placeholder col-4"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PurchaseDetailSkeleton;
