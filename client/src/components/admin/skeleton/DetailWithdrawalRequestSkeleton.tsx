import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailWithdrawalRequestSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <div className="row g-4">
        {/* Left Column */}
        <div className="col-12 col-xl-4 col-md-5">
          {/* Withdrawal Information Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              {/* State badge */}
              <div className="mb-3 d-flex gap-2">
                <Placeholder
                  style={{ width: "100px", height: "24px" }}
                  className="rounded-pill"
                />
              </div>

              <hr className="opacity-25" />

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

          {/* Bank Account Card */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row">
                {[1, 2, 3, 4].map((i) => (
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

        {/* Right Column */}
        <div className="col-12 col-xl-8 col-md-7">
          {/* Withdrawal State History */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <Placeholder as="h2" className="fs-5 mb-0 w-25">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-end gap-2 mb-3">
                <Placeholder
                  style={{ width: "40px", height: "36px" }}
                  className="rounded"
                />
                <Placeholder
                  style={{ width: "40px", height: "36px" }}
                  className="rounded"
                />
              </div>

              <div className="mt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="pb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex gap-2">
                        <Placeholder
                          style={{ width: "100px", height: "22px" }}
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
      </div>
    </Placeholder>
  );
});

DetailWithdrawalRequestSkeleton.displayName = "DetailWithdrawalRequestSkeleton";

export default DetailWithdrawalRequestSkeleton;
