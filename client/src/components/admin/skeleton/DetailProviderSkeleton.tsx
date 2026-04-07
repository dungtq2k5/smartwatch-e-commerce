import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailProviderSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <Placeholder as="h1" className="w-50 mb-4" style={{ height: "38px" }} />

      <div className="row g-4">
        {/* Left Column: Provider Info */}
        <div className="col-12 col-xl-4 col-md-5">
          {/* Provider Information Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 card-title mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div className="col-sm-6 mb-3" key={i}>
                    <Placeholder as="span" className="d-block w-50 mb-1">
                      <Placeholder xs={12} />
                    </Placeholder>
                    <Placeholder xs={i % 2 === 0 ? 10 : 8} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 card-title mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row">
                {[1, 2, 3].map((i) => (
                  <div className="col-12 mb-3" key={i}>
                    <Placeholder className="d-block w-50 mb-1">
                      <Placeholder xs={12} />
                    </Placeholder>
                    <Placeholder xs={10} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Addresses */}
        <div className="col-12 col-xl-8 col-md-7">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <Placeholder as="h2" className="fs-5 card-title mb-0 w-25">
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
                  <div className="small text-muted mt-2">
                    <Placeholder xs={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

DetailProviderSkeleton.displayName = "DetailProviderSkeleton";

export default DetailProviderSkeleton;
