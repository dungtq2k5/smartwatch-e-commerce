import { forwardRef, useRef } from "react";
import type { OrderReturnDetailResponse } from "../../../../common/types.common";
import { PROJECT_NAME } from "../../../../common/configs.common";

const ReturnLabelHtml = forwardRef<
  HTMLDivElement,
  { returnDetail: OrderReturnDetailResponse }
>(({ returnDetail }, ref) => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Render ReturnLabelHtml:", renderCount.current);

  return (
    <div
      ref={ref}
      className="pdf-label-container border border-dark border-4 p-3"
    >
      {/* Section 1: Addresses */}
      <div className="row border-bottom border-dark border-4 pb-3 mb-3">
        <div className="col-5 border-end border-dark border-4">
          <p className="badge text-bg-dark text-uppercase fs-6 mb-2">
            Ship To:
          </p>
          <div className="fw-bold">{PROJECT_NAME}</div>
          <div>123 Business Rd, Suite 100</div>
          <div>Business City, 12345, USA</div>
        </div>
        <div className="col-7 ps-4">
          <p className="badge text-bg-dark text-uppercase fs-6 mb-2">From:</p>
          <div className="fw-bold">{returnDetail.pickupAddress.name}</div>
          <div>{returnDetail.pickupAddress.fullAddress}</div>
        </div>
      </div>

      {/* Section 2: Order Details */}
      <div className="row border-bottom border-dark border-4 pb-3 mb-3">
        <div className="col-7 border-end border-dark border-4">
          <p className="fs-6 fw-semibold text-uppercase mb-2">Details:</p>
          <div className="d-flex justify-content-between align-items-end">
            <span className="fw-bold">ORDER ID:</span>
            <span>{returnDetail.orderId}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="fw-bold">WEIGHT:</span>
            <span>N/A</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="fw-bold">DIMENSIONS:</span>
            <span>N/A</span>
          </div>
          <div className="d-flex justify-content-between align-items-end">
            <span className="fw-bold">ESTIMATE PICKUP DATE:</span>
            <span>
              {new Date(returnDetail.estimatePickupDate).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="col-5 ps-4">
          <p className="fs-6 fw-semibold text-uppercase mb-2">Remarks:</p>
          <div>Return/Refund</div>
        </div>
      </div>

      {/* Section 3: Tracking */}
      <div className="text-center">
        <p className="text-uppercase small mb-2">Tracking ID (Return ID):</p>
        <div
          className="h3"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            letterSpacing: "0.1rem",
            wordBreak: "break-all",
          }}
        >
          {returnDetail.id}
        </div>
        <div className="small mt-1">(Barcode will be displayed here)</div>
      </div>
    </div>
  );
});

export default ReturnLabelHtml;
