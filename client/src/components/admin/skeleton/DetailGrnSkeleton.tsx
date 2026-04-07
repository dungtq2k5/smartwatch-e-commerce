import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailGrnSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <Placeholder as="h1" className="w-50 mb-4" style={{ height: "38px" }} />

      <div className="row g-4">
        {/* Left Column: General Info */}
        <div className="col-12 col-xl-4 col-md-5">
          <div className="card shadow-sm border-0">
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
        </div>

        {/* Right Column: Items & History */}
        <div className="col-12 col-xl-8 col-md-7">
          {/* Items Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 card-title mb-0 w-25">
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
                    style={{ width: "80px", height: "80px" }}
                  />
                  <div className="col flex-grow-1">
                    <Placeholder as="div" className="mb-1">
                      <Placeholder xs={8} />
                    </Placeholder>
                    <Placeholder as="div" className="mb-2">
                      <Placeholder xs={6} />
                    </Placeholder>
                    <Placeholder as="div" className="mb-2">
                      <Placeholder xs={5} />
                    </Placeholder>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <Placeholder as="div" className="mb-1">
                      <Placeholder xs={12} style={{ width: "60px" }} />
                    </Placeholder>
                    <Placeholder style={{ width: "40px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* State History Card */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 card-title mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              {[1, 2, 3].map((i) => (
                <div key={i} className="pb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex gap-2">
                      <Placeholder
                        style={{ width: "80px", height: "22px" }}
                        className="rounded-pill"
                      />
                      {i === 1 && (
                        <Placeholder
                          style={{ width: "60px", height: "22px" }}
                          className="rounded-pill"
                        />
                      )}
                    </div>
                    <Placeholder xs={2} />
                  </div>
                  <div className="card border p-3">
                    <Placeholder as="p" animation="glow">
                      <Placeholder xs={4} />
                      <br />
                      <Placeholder xs={7} />
                    </Placeholder>
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

DetailGrnSkeleton.displayName = "DetailGrnSkeleton";

export default DetailGrnSkeleton;
