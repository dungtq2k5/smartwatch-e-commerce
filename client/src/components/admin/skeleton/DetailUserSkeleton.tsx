export default function DetailUserSkeleton() {
  return (
    <div className="placeholder-glow">
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="placeholder col-3" style={{ height: "38px" }}></span>
        <span className="placeholder col-2" style={{ height: "38px" }}></span>
      </div>

      <div className="row">
        <div className="col-lg-4">
          {/* User Profile Card */}
          <div className="card text-center mb-4">
            <div className="card-body">
              <span
                className="placeholder rounded-circle mx-auto d-block mb-3"
                style={{ width: "128px", height: "128px" }}
              ></span>
              <p className="card-title mb-0">
                <span className="placeholder col-6"></span>
              </p>
              <p className="text-muted mb-1">
                <span className="placeholder col-8"></span>
              </p>
              <p className="text-muted mb-0">
                <span className="placeholder col-7"></span>
              </p>
            </div>
          </div>

          {/* User Details Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h2 className="fs-6 mb-0">
                <span className="placeholder col-4"></span>
              </h2>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="row mb-2 mx-0">
                    <dt className="col-sm-5 ps-0">
                      <span className="placeholder col-10"></span>
                    </dt>
                    <dd className="col-sm-7 pe-0">
                      <span className="placeholder col-10"></span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Roles Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="fs-6 mb-0">
                <span className="placeholder col-3"></span>
              </h2>
            </div>
            <div className="list-group list-group-flush">
              <div className="list-group-item">
                <p className="mb-1">
                  <span className="placeholder col-5"></span>
                </p>
                <small className="d-block">
                  <span className="placeholder col-8"></span>
                </small>
                <small className="d-block">
                  <span className="placeholder col-6"></span>
                </small>
              </div>
              <div className="list-group-item">
                <p className="mb-1">
                  <span className="placeholder col-4"></span>
                </p>
                <small className="d-block">
                  <span className="placeholder col-7"></span>
                </small>
                <small className="d-block">
                  <span className="placeholder col-5"></span>
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {/* Addresses Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h2 className="fs-6 mb-0">
                <span className="placeholder col-4"></span>
              </h2>
            </div>
            <div className="card-body">
              <div className="mb-3 pb-3 border-bottom">
                <p className="mb-1">
                  <span className="placeholder col-5"></span>
                </p>
                <p className="mb-1">
                  <span className="placeholder col-8"></span>
                </p>
                <p className="mb-0">
                  <span className="placeholder col-4"></span>
                </p>
              </div>
              <p className="mb-0">
                <span className="placeholder col-6"></span>
              </p>
            </div>
          </div>

          {/* Payment Methods Card */}
          <div className="card mb-4">
            <div className="card-header">
              <h2 className="fs-6 mb-0">
                <span className="placeholder col-5"></span>
              </h2>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                <span
                  className="placeholder"
                  style={{ width: "32px", height: "32px" }}
                ></span>
                <div>
                  <p className="mb-1">
                    <span className="placeholder col-8"></span>
                  </p>
                  <p className="mb-0 small">
                    <span className="placeholder col-12"></span>
                  </p>
                </div>
              </div>
              <p className="mb-0">
                <span className="placeholder col-7"></span>
              </p>
            </div>
          </div>

          {/* Bank Accounts Card */}
          <div className="card mb-2">
            <div className="card-header">
              <h2 className="fs-6 mb-0">
                <span className="placeholder col-5"></span>
              </h2>
            </div>
            <div className="card-body">
              <p className="mb-0">
                <span className="placeholder col-6"></span>
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="d-flex justify-content-end mt-3">
            <span
              className="placeholder"
              style={{ width: "90px", height: "38px" }}
            ></span>
          </div>
        </div>
      </div>
    </div>
  );
}
