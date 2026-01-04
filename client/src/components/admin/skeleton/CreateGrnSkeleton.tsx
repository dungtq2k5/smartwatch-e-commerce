import type { JSX } from "react";

export default function CreateGrnSkeleton(): JSX.Element {
  return (
    <div className="placeholder-glow">
      {/* Heading */}
      <div className="mb-4">
        <span className="placeholder col-4 bg-secondary rounded"></span>
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-lg-8">
          {/* General Info */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <span className="placeholder col-4 rounded"></span>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <span className="placeholder col-2 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
              </div>
              <div className="mb-3">
                <span className="placeholder col-2 mb-2 rounded"></span>
                <span className="placeholder col-12 form-select rounded"></span>
              </div>
              <div className="mb-3">
                <span className="placeholder col-3 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
              </div>
              <div className="mb-3">
                <span className="placeholder col-2 mb-2 rounded"></span>
                <span
                  className="placeholder col-12 form-control rounded"
                  style={{ height: "8em" }}
                ></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
          {/* File Upload */}
          <div className="card shadow-sm mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span className="placeholder col-4 rounded"></span>
              <span className="placeholder col-3 btn btn-sm rounded"></span>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <span className="placeholder col-4 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
              </div>
              <div className="mb-3">
                <span className="placeholder col-4 mb-2 rounded"></span>
                <span className="placeholder col-12 form-control rounded"></span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <span className="placeholder col-4 rounded"></span>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <span className="placeholder col-4 mb-2 rounded"></span>
                <span className="placeholder col-12 form-select rounded"></span>
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
