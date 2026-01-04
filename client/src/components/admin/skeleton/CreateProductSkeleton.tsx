import type { JSX } from "react";

export default function CreateProductSkeleton(): JSX.Element {
  return (
    <div className="placeholder-glow">
      {/* Heading */}
      <div className="mb-4">
        <span className="placeholder col-4 bg-secondary rounded"></span>
      </div>

      <div className="row">
        {/* Left column */}
        <div className="col-lg-8">
          {/* General Info Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <span className="placeholder col-4 rounded"></span>
            </div>
            <div className="card-body">
              {/* Name */}
              <div className="mb-3">
                <span className="placeholder col-2 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
              </div>

              {/* Description */}
              <div className="mb-3">
                <span className="placeholder col-2 mb-2 rounded"></span>
                <span
                  className="placeholder col-12 form-control rounded"
                  style={{ height: "8em" }}
                ></span>
              </div>

              <div className="row">
                {/* Type, Brand, Category */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="col-md-4 mb-3">
                    <span className="placeholder col-4 mb-2 rounded"></span>
                    <span className="placeholder col-12 form-select rounded"></span>
                  </div>
                ))}
              </div>

              {/* Base Price */}
              <div className="mb-3">
                <span className="placeholder col-3 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
              </div>

              {/* Stop Selling */}
              <div className="mt-3">
                <span className="placeholder col-4 rounded"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-lg-4">
          {/* Images Card */}
          <div className="card shadow-sm">
            <div className="card-header">
              <span className="placeholder col-6 rounded"></span>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-12">
                  <span
                    className="placeholder col-12 rounded"
                    style={{ height: "10em" }}
                  ></span>
                </div>
              </div>
              <div className="mt-3">
                <span className="placeholder col-4 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
                <span className="placeholder col-12 btn mt-2 rounded"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-end gap-2 mt-4">
        <span className="placeholder col-1 btn rounded"></span>
        <span className="placeholder col-1 btn rounded"></span>
      </div>
    </div>
  );
}
