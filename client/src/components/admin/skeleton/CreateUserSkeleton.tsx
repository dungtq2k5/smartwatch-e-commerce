import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const CreateUserSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow">
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Placeholder as="h1" className="fs-2 mb-0 d-flex gap-2 w-100">
          <Placeholder xs={4} style={{ height: "38px" }} />
          <Placeholder xs={1} style={{ height: "38px" }} />
          <Placeholder xs={3} style={{ height: "38px" }} />
        </Placeholder>
      </div>

      {/* Form */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row">
            {/* Left column */}
            <div className="col-lg-8">
              {/* Full name */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label">
                  <Placeholder xs={2} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              {/* Email */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label">
                  <Placeholder xs={2} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              {/* Phone */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label">
                  <Placeholder xs={2} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              {/* Password */}
              <div className="mb-3">
                <Placeholder as="label" className="form-label">
                  <Placeholder xs={3} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              <div className="row">
                {/* Birth */}
                <div className="col-md-6 mb-3">
                  <Placeholder as="label" className="form-label">
                    <Placeholder xs={4} />
                  </Placeholder>
                  <Placeholder xs={12} style={{ height: "38px" }} />
                </div>
                {/* Gender */}
                <div className="col-md-6 mb-3">
                  <Placeholder as="label" className="form-label">
                    <Placeholder xs={3} />
                  </Placeholder>
                  <Placeholder xs={12} style={{ height: "38px" }} />
                </div>
              </div>
              {/* Locked */}
              <div className="mb-3">
                <Placeholder xs={4} style={{ height: "24px" }} />
              </div>
              {/* Roles */}
              <div>
                <Placeholder as="p" className="form-label">
                  <Placeholder xs={1} />
                </Placeholder>
                <div className="d-flex gap-3">
                  <Placeholder xs={2} style={{ height: "24px" }} />
                  <Placeholder xs={2} style={{ height: "24px" }} />
                </div>
              </div>
            </div>
            {/* Right column */}
            <div className="col-lg-4">
              <div className="text-center">
                <Placeholder as="p" className="fs-5 mb-3">
                  <Placeholder xs={4} />
                </Placeholder>
                <Placeholder
                  className="rounded-circle mx-auto d-block"
                  style={{ width: "128px", height: "128px" }}
                />
                <div className="mt-3">
                  <Placeholder xs={5} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer text-end">
          <div className="d-flex justify-content-end gap-2">
            <Placeholder.Button variant="secondary" style={{ width: "90px" }} />
            <Placeholder.Button variant="primary" style={{ width: "120px" }} />
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

export default CreateUserSkeleton;
