import { memo } from "react";

const PurchaseCardSkeleton = memo(() => {
  return (
    <div className="card mb-3" aria-hidden="true">
      {/* Header */}
      <div className="card-header bg-white d-flex justify-content-between align-items-center placeholder-glow">
        <span className="placeholder col-3"></span>
        <span className="placeholder col-4"></span>
      </div>

      {/* Item list */}
      <div className="card-body placeholder-glow">
        <div className="d-flex gap-3">
          <div
            className="placeholder purchase-item-img--g rounded"
            style={{ width: "4em", height: "4em" }}
          ></div>
          <div className="flex-grow-1">
            <p className="mb-1 fw-semibold">
              <span className="placeholder col-8"></span>
            </p>
            <div className="small text-muted mb-2">
              <span className="placeholder col-4"></span>
            </div>
            <div className="d-flex justify-content-between">
              <span className="placeholder col-3"></span>
              <span className="placeholder col-2"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="card-footer bg-light-subtle placeholder-glow">
        <p className="mb-4 text-end">
          <span className="placeholder col-3"></span>
        </p>
        <div className="d-flex justify-content-end align-items-center mb-2">
          <span
            className="placeholder"
            style={{ width: "8rem", height: "2.25rem", borderRadius: "4px" }}
          ></span>
        </div>
      </div>
    </div>
  );
});

export default PurchaseCardSkeleton;
