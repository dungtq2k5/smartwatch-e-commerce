import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailUserSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow">
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Placeholder xs={3} style={{ height: "38px" }} />
        <Placeholder xs={2} style={{ height: "38px" }} />
      </div>

      <div className="row">
        <div className="col-lg-4">
          {/* User Profile Card */}
          <div className="card text-center mb-4">
            <div className="card-body">
              <Placeholder
                className="rounded-circle mx-auto d-block mb-3"
                style={{ width: "128px", height: "128px" }}
              />
              <Placeholder as="p" className="card-title mb-0">
                <Placeholder xs={6} />
              </Placeholder>
              <Placeholder as="p" className="text-muted mb-1">
                <Placeholder xs={8} />
              </Placeholder>
              <Placeholder as="p" className="text-muted mb-0">
                <Placeholder xs={7} />
              </Placeholder>
            </div>
          </div>

          {/* User Details Card */}
          <div className="card mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-6 mb-0">
                <Placeholder xs={4} />
              </Placeholder>
            </div>
            <div className="card-body">
              <dl className="row mb-0">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="row mb-2 mx-0">
                    <dt className="col-sm-5 ps-0">
                      <Placeholder xs={10} />
                    </dt>
                    <dd className="col-sm-7 pe-0">
                      <Placeholder xs={10} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Roles Card */}
          <div className="card">
            <div className="card-header">
              <Placeholder as="h2" className="fs-6 mb-0">
                <Placeholder xs={3} />
              </Placeholder>
            </div>
            <div className="list-group list-group-flush">
              <div className="list-group-item">
                <Placeholder as="p" className="mb-1">
                  <Placeholder xs={5} />
                </Placeholder>
                <Placeholder as="small" className="d-block">
                  <Placeholder xs={8} />
                </Placeholder>
                <Placeholder as="small" className="d-block">
                  <Placeholder xs={6} />
                </Placeholder>
              </div>
              <div className="list-group-item">
                <Placeholder as="p" className="mb-1">
                  <Placeholder xs={4} />
                </Placeholder>
                <Placeholder as="small" className="d-block">
                  <Placeholder xs={7} />
                </Placeholder>
                <Placeholder as="small" className="d-block">
                  <Placeholder xs={5} />
                </Placeholder>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {/* Addresses Card */}
          <div className="card mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-6 mb-0">
                <Placeholder xs={4} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="mb-3 pb-3 border-bottom">
                <Placeholder as="p" className="mb-1">
                  <Placeholder xs={5} />
                </Placeholder>
                <Placeholder as="p" className="mb-1">
                  <Placeholder xs={8} />
                </Placeholder>
                <Placeholder as="p" className="mb-0">
                  <Placeholder xs={4} />
                </Placeholder>
              </div>
              <Placeholder as="p" className="mb-0">
                <Placeholder xs={6} />
              </Placeholder>
            </div>
          </div>

          {/* Payment Methods Card */}
          <div className="card mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-6 mb-0">
                <Placeholder xs={5} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                <Placeholder style={{ width: "32px", height: "32px" }} />
                <div>
                  <Placeholder as="p" className="mb-1">
                    <Placeholder xs={8} />
                  </Placeholder>
                  <Placeholder as="p" className="mb-0 small">
                    <Placeholder xs={12} />
                  </Placeholder>
                </div>
              </div>
              <Placeholder as="p" className="mb-0">
                <Placeholder xs={7} />
              </Placeholder>
            </div>
          </div>

          {/* Bank Accounts Card */}
          <div className="card mb-2">
            <div className="card-header">
              <Placeholder as="h2" className="fs-6 mb-0">
                <Placeholder xs={5} />
              </Placeholder>
            </div>
            <div className="card-body">
              <Placeholder as="p" className="mb-0">
                <Placeholder xs={6} />
              </Placeholder>
            </div>
          </div>

          {/* Buttons */}
          <div className="d-flex justify-content-end mt-3">
            <Placeholder.Button variant="primary" style={{ width: "90px" }} />
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

export default DetailUserSkeleton;
