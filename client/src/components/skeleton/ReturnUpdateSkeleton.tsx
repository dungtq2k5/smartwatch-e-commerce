import { memo } from "react";

const ReturnUpdateSkeleton = memo(() => {
  return (
    <div aria-hidden="true">
      <h1 className="mb-4 fw-semibold text-center placeholder-glow">
        <span className="placeholder col-4 w-100"></span>
      </h1>

      <div className="row g-4 placeholder-glow">
        {/* Left Column */}
        <div className="col-lg-8">
          <div className="d-flex flex-column gap-4">
            {/* Reason for return */}
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 placeholder col-5"></h2>
              </div>
              <div className="card-body">
                <span className="form-select placeholder col-12"></span>
              </div>
            </div>

            {/* Images upload */}
            <div className="card shadow-sm">
              <div className="card-header bg-white py-3">
                <h2 className="h5 mb-0 placeholder col-6"></h2>
              </div>
              <div className="card-body">
                <div className="create-return-img-upload-box placeholder"></div>
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
              <h2 className="h5 mb-0 placeholder col-8"></h2>
            </div>
            <div className="card-body">
              <div
                className="placeholder col-12"
                style={{ height: "100px" }}
              ></div>
              <hr />
              <span className="form-control placeholder col-12"></span>
            </div>
            <div className="card-footer d-flex gap-2">
              <span className="btn btn-primary w-50 disabled placeholder col-6"></span>
              <span className="btn btn-secondary w-50 disabled placeholder col-6"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ReturnUpdateSkeleton;
