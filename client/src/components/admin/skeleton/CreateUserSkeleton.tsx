export default function CreateUserSkeleton() {
  return (
    <div className="placeholder-glow">
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fs-2 mb-0 d-flex gap-2 w-100">
          <span className="placeholder col-4" style={{ height: "38px" }}></span>
          <span className="placeholder col-1" style={{ height: "38px" }}></span>
          <span className="placeholder col-3" style={{ height: "38px" }}></span>
        </h1>
      </div>

      {/* Form */}
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row">
            {/* Left column */}
            <div className="col-lg-8">
              {/* Full name */}
              <div className="mb-3">
                <label className="form-label">
                  <span className="placeholder col-2"></span>
                </label>
                <div className="placeholder col-12" style={{ height: "38px" }}></div>
              </div>
              {/* Email */}
              <div className="mb-3">
                <label className="form-label">
                  <span className="placeholder col-2"></span>
                </label>
                <div className="placeholder col-12" style={{ height: "38px" }}></div>
              </div>
              {/* Phone */}
              <div className="mb-3">
                <label className="form-label">
                  <span className="placeholder col-2"></span>
                </label>
                <div className="placeholder col-12" style={{ height: "38px" }}></div>
              </div>
              {/* Password */}
              <div className="mb-3">
                <label className="form-label">
                  <span className="placeholder col-3"></span>
                </label>
                <div className="placeholder col-12" style={{ height: "38px" }}></div>
              </div>
              <div className="row">
                {/* Birth */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <span className="placeholder col-4"></span>
                  </label>
                  <div className="placeholder col-12" style={{ height: "38px" }}></div>
                </div>
                {/* Gender */}
                <div className="col-md-6 mb-3">
                  <label className="form-label">
                    <span className="placeholder col-3"></span>
                  </label>
                  <div className="placeholder col-12" style={{ height: "38px" }}></div>
                </div>
              </div>
              {/* Locked */}
              <div className="mb-3">
                <span className="placeholder col-4" style={{ height: "24px" }}></span>
              </div>
              {/* Roles */}
              <div>
                <p className="form-label">
                  <span className="placeholder col-1"></span>
                </p>
                <div className="d-flex gap-3">
                  <span className="placeholder col-2" style={{ height: "24px" }}></span>
                  <span className="placeholder col-2" style={{ height: "24px" }}></span>
                </div>
              </div>
            </div>
            {/* Right column */}
            <div className="col-lg-4">
              <div className="text-center">
                <p className="fs-5 mb-3">
                  <span className="placeholder col-4"></span>
                </p>
                <span
                  className="placeholder rounded-circle mx-auto d-block"
                  style={{ width: "128px", height: "128px" }}
                ></span>
                <div className="mt-3">
                  <span className="placeholder col-5"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer text-end">
          <div className="d-flex justify-content-end gap-2">
            <span className="placeholder" style={{ width: "90px", height: "38px" }}></span>
            <span className="placeholder" style={{ width: "120px", height: "38px" }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}
