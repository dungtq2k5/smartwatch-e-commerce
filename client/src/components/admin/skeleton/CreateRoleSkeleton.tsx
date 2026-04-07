import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const CreateRoleSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <form>
        <div className="row">
          {/* Left Column - Role Information */}
          <div className="col-lg-8">
            {/* General Information Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-header">
                <Placeholder as="h2" className="fs-5 mb-0 w-25">
                  <Placeholder xs={12} />
                </Placeholder>
              </div>
              <div className="card-body">
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
            </div>

            {/* Permissions Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <Placeholder as="h2" className="fs-5 mb-0 w-25">
                  <Placeholder xs={12} />
                </Placeholder>
                <div className="form-check m-0">
                  <Placeholder
                    as="input"
                    type="checkbox"
                    className="form-check-input"
                    style={{ width: "20px", height: "20px" }}
                  />
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "30%" }}>
                          <Placeholder xs={4} />
                        </th>
                        <th className="text-center" style={{ width: "17.5%" }}>
                          <Placeholder xs={3} />
                        </th>
                        <th className="text-center" style={{ width: "17.5%" }}>
                          <Placeholder xs={3} />
                        </th>
                        <th className="text-center" style={{ width: "17.5%" }}>
                          <Placeholder xs={3} />
                        </th>
                        <th className="text-center" style={{ width: "17.5%" }}>
                          <Placeholder xs={3} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i}>
                          <td>
                            <Placeholder xs={5} />
                          </td>
                          <td className="text-center">
                            <Placeholder
                              style={{
                                width: "20px",
                                height: "20px",
                                display: "inline-block",
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <Placeholder
                              style={{
                                width: "20px",
                                height: "20px",
                                display: "inline-block",
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <Placeholder
                              style={{
                                width: "20px",
                                height: "20px",
                                display: "inline-block",
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <Placeholder
                              style={{
                                width: "20px",
                                height: "20px",
                                display: "inline-block",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="col-lg-4">
            {/* Summary Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-header">
                <Placeholder as="h2" className="fs-5 mb-0 w-25">
                  <Placeholder xs={12} />
                </Placeholder>
              </div>
              <div className="card-body">
                {[1, 2, 3].map((i) => (
                  <div className="mb-3" key={i}>
                    <Placeholder
                      as="span"
                      className="form-label fw-bold d-block mb-1 w-50"
                    >
                      <Placeholder xs={12} />
                    </Placeholder>
                    <Placeholder xs={8} />
                  </div>
                ))}
              </div>
            </div>

            {/* Info Note Card */}
            <div className="card shadow-sm mb-4 border-warning">
              <div className="card-body">
                <Placeholder as="h3" className="fs-6 fw-bold mb-2 w-50">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder as="p" className="small text-muted mb-0">
                  <Placeholder xs={12} className="mb-2" />
                  <Placeholder xs={10} />
                </Placeholder>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex justify-content-end gap-2">
          <Placeholder
            as="button"
            className="btn btn-secondary"
            style={{ width: "100px", height: "38px" }}
          />
          <Placeholder
            as="button"
            className="btn btn-primary"
            style={{ width: "120px", height: "38px" }}
          />
        </div>
      </form>
    </Placeholder>
  );
});

CreateRoleSkeleton.displayName = "CreateRoleSkeleton";

export default CreateRoleSkeleton;
