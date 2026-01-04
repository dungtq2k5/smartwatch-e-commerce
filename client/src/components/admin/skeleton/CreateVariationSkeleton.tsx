import type { JSX } from "react";

export default function CreateVariationSkeleton(): JSX.Element {
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
                <span className="placeholder col-12 form-control rounded"></span>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <span className="placeholder col-12 form-control rounded"></span>
                </div>
                <div className="col-md-6 mb-3">
                  <span className="placeholder col-12 form-control rounded"></span>
                </div>
              </div>
            </div>
          </div>

          {/* Band Specs */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <span className="placeholder col-4 rounded"></span>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <span className="placeholder col-12 form-control rounded"></span>
                </div>
                <div className="col-md-6 mb-3">
                  <span className="placeholder col-12 form-control rounded"></span>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <span className="placeholder col-12 form-control rounded"></span>
                </div>
                <div className="col-md-6 mb-3">
                  <span className="placeholder col-12 form-control rounded"></span>
                </div>
              </div>
              <div className="mb-3">
                <span className="placeholder col-12 form-control rounded"></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
          {/* Images */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <span className="placeholder col-6 rounded"></span>
            </div>
            <div className="card-body">
              <span
                className="placeholder col-12 rounded"
                style={{ height: "10em" }}
              ></span>
              <div className="mt-3">
                <span className="placeholder col-12 form-control rounded"></span>
                <span className="placeholder col-12 btn mt-2 rounded"></span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <span className="placeholder col-6 rounded"></span>
            </div>
            <div className="card-body">
              <span className="placeholder col-8 rounded"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
