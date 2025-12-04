import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const PurchaseCardSkeleton = memo(() => {
  return (
    <div className="card mb-3" aria-hidden="true">
      {/* Header */}
      <Placeholder
        as="div"
        animation="glow"
        className="card-header bg-white d-flex justify-content-between align-items-center"
      >
        <Placeholder xs={3} />
        <Placeholder xs={4} />
      </Placeholder>

      {/* Item list */}
      <Placeholder as="div" animation="glow" className="card-body">
        <div className="d-flex gap-3">
          <Placeholder
            className="purchase-item-img--g rounded"
            style={{ width: "4em", height: "4em" }}
          />
          <div className="flex-grow-1">
            <Placeholder as="p" className="mb-1 fw-semibold">
              <Placeholder xs={8} />
            </Placeholder>
            <Placeholder as="div" className="small text-muted mb-2">
              <Placeholder xs={4} />
            </Placeholder>
            <div className="d-flex justify-content-between">
              <Placeholder xs={3} />
              <Placeholder xs={2} />
            </div>
          </div>
        </div>
      </Placeholder>

      {/* Footer */}
      <Placeholder
        as="div"
        animation="glow"
        className="card-footer bg-light-subtle"
      >
        <Placeholder as="p" className="mb-4 text-end">
          <Placeholder xs={3} />
        </Placeholder>
        <div className="d-flex justify-content-end align-items-center mb-2">
          <Placeholder
            style={{ width: "8rem", height: "2.25rem", borderRadius: "4px" }}
          />
        </div>
      </Placeholder>
    </div>
  );
});

export default PurchaseCardSkeleton;
