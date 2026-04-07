import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const EditProviderSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <Placeholder as="h1" className="w-50 mb-4" style={{ height: "38px" }} />

      <form>
        <div className="row g-4">
          {/* Left Column: Basic Info */}
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

            {/* Email Field */}
            <div className="mb-3">
              <Placeholder as="label" className="form-label mb-2 w-25">
                <Placeholder xs={12} />
              </Placeholder>
              <Placeholder
                as="input"
                type="email"
                className="form-control"
                style={{ height: "38px" }}
              />
            </div>

            {/* Phone Field */}
            <div className="mb-3">
              <Placeholder as="label" className="form-label mb-2 w-25">
                <Placeholder xs={12} />
              </Placeholder>
              <Placeholder
                as="input"
                type="tel"
                className="form-control"
                style={{ height: "38px" }}
              />
            </div>

            {/* Contact Person */}
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
          </div>

          {/* Right Column: Addresses */}
          <div className="col-12 col-xl-6">
            <div className="card shadow-sm border-0">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                <Placeholder as="h2" className="fs-5 card-title mb-0 w-50">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder
                  as="button"
                  className="btn btn-sm btn-primary"
                  style={{ width: "100px", height: "32px" }}
                />
              </div>
              <div className="card-body">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`pb-3 ${i === 1 ? "mb-3 border-bottom" : ""}`}
                  >
                    <div className="mb-2">
                      <Placeholder xs={12} style={{ width: "60%" }} />
                    </div>
                    <div className="small text-muted">
                      <Placeholder xs={12} style={{ width: "80%" }} />
                    </div>
                    <div className="mt-2">
                      <Placeholder
                        as="button"
                        className="btn btn-sm btn-danger"
                        style={{ width: "80px", height: "28px" }}
                      />
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

EditProviderSkeleton.displayName = "EditProviderSkeleton";

export default EditProviderSkeleton;
