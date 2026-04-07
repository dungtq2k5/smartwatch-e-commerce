import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailRoleSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
        <Placeholder
          as="button"
          className="btn btn-primary"
          style={{ width: "150px", height: "38px" }}
        />
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-lg-8">
          {/* General Information Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <Placeholder as="dt" className="col-sm-3">
                      <Placeholder xs={4} />
                    </Placeholder>
                    <Placeholder as="dd" className="col-sm-9">
                      <Placeholder xs={6} />
                    </Placeholder>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Permissions Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="col-12">
                    <div className="card border">
                      <div className="card-header bg-light">
                        <Placeholder
                          as="h3"
                          className="fs-6 fw-semibold mb-0 w-50"
                        >
                          <Placeholder xs={12} />
                        </Placeholder>
                      </div>
                      <div className="card-body">
                        {[1, 2].map((j) => (
                          <div key={j} className="mb-2">
                            <Placeholder xs={8} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
          {/* Created Information Card */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                {[1, 2].map((i) => (
                  <div key={i}>
                    <Placeholder as="dt" className="col-6">
                      <Placeholder xs={5} />
                    </Placeholder>
                    <Placeholder as="dd" className="col-6">
                      <Placeholder xs={6} />
                    </Placeholder>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

DetailRoleSkeleton.displayName = "DetailRoleSkeleton";

export default DetailRoleSkeleton;
