import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const EditProductSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow">
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Placeholder as="h1" className="fs-2 mb-0 w-50">
          <Placeholder xs={12} style={{ height: "38px" }} />
        </Placeholder>
      </div>

      {/* Form */}
      <div className="row">
        {/* Left Column */}
        <div className="col-lg-8">
          {/* General Info Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0">
                <Placeholder xs={4} />
              </Placeholder>
            </div>
            <div className="card-body">
              {/* Name */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label w-25">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              {/* Description */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label w-25">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "100px" }} />
              </div>
              {/* Selects Row */}
              <div className="row">
                <div className="col-md-4 mb-3">
                  <Placeholder xs={12} style={{ height: "38px", marginTop: "32px" }} />
                </div>
                <div className="col-md-4 mb-3">
                  <Placeholder xs={12} style={{ height: "38px", marginTop: "32px" }} />
                </div>
                <div className="col-md-4 mb-3">
                  <Placeholder xs={12} style={{ height: "38px", marginTop: "32px" }} />
                </div>
              </div>
              {/* Base Price */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label w-25">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              {/* Switch */}
              <div className="mt-3">
                <Placeholder xs={4} style={{ height: "24px" }} />
              </div>
            </div>
          </div>

          {/* Additional Info Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0">
                <Placeholder xs={4} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div className="col-md-6 mb-3" key={i}>
                    <Placeholder as="label" className="form-label w-50">
                      <Placeholder xs={12} />
                    </Placeholder>
                    <Placeholder xs={12} style={{ height: "38px" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0">
                <Placeholder xs={6} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row g-2">
                {[1, 2, 3].map((i) => (
                  <div className="col-4" key={i}>
                    <Placeholder className="w-100" style={{ height: "6em" }} />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Placeholder xs={12} style={{ height: "38px" }} />
                <Placeholder xs={12} style={{ height: "38px", marginTop: "8px" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="d-flex justify-content-end gap-2 mt-4">
        <Placeholder.Button variant="secondary" style={{ width: "80px" }} />
        <Placeholder.Button variant="primary" style={{ width: "80px" }} />
      </div>
    </Placeholder>
  );
});

export default EditProductSkeleton;
