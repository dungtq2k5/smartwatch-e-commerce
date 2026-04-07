import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const EditGrnSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <Placeholder as="h1" className="w-50 mb-4" style={{ height: "38px" }} />

      <form>
        <div className="row g-4">
          {/* Left Column: Basic Fields */}
          <div className="col-12 col-xl-6">
            {/* Name Field */}
            <div className="mb-3">
              <Placeholder as="label" className="form-label mb-2 w-25">
                <Placeholder xs={12} />
              </Placeholder>
              <Placeholder
                as="input"
                className="form-control"
                style={{ height: "38px" }}
              />
            </div>

            {/* Provider Field */}
            <div className="mb-3">
              <Placeholder as="label" className="form-label mb-2 w-25">
                <Placeholder xs={12} />
              </Placeholder>
              <Placeholder as="select" className="form-select">
                <Placeholder xs={12} style={{ height: "38px" }} />
              </Placeholder>
            </div>

            {/* Date Field */}
            <div className="mb-3">
              <Placeholder as="label" className="form-label mb-2 w-25">
                <Placeholder xs={12} />
              </Placeholder>
              <Placeholder
                as="input"
                type="date"
                className="form-control"
                style={{ height: "38px" }}
              />
            </div>

            {/* Notes Field */}
            <div className="mb-3">
              <Placeholder as="label" className="form-label mb-2 w-25">
                <Placeholder xs={12} />
              </Placeholder>
              <Placeholder
                as="textarea"
                className="form-control"
                style={{ height: "100px" }}
              />
            </div>
          </div>

          {/* Right Column: Items */}
          <div className="col-12 col-xl-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3">
                <Placeholder as="h2" className="fs-5 card-title mb-0 w-50">
                  <Placeholder xs={12} />
                </Placeholder>
              </div>
              <div className="card-body">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`d-flex gap-3 pb-3 ${
                      i === 1 ? "mb-3 border-bottom" : ""
                    }`}
                  >
                    <Placeholder
                      className="rounded flex-shrink-0"
                      style={{ width: "60px", height: "60px" }}
                    />
                    <div className="flex-grow-1">
                      <Placeholder xs={10} className="mb-2" />
                      <Placeholder xs={8} className="mb-2" />
                      <Placeholder xs={6} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-4">
          <Placeholder
            as="button"
            className="btn btn-primary"
            style={{ width: "100px", height: "38px" }}
          />
        </div>
      </form>
    </Placeholder>
  );
});

EditGrnSkeleton.displayName = "EditGrnSkeleton";

export default EditGrnSkeleton;
