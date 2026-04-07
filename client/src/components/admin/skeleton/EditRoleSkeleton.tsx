import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const EditRoleSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <form>
        {/* Name Field */}
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

        {/* Permissions Table */}
        <div className="card shadow-sm border-0">
          <div className="card-header d-flex justify-content-between align-items-center">
            <Placeholder as="h2" className="fs-5 mb-0 w-25">
              <Placeholder xs={12} />
            </Placeholder>
            <div className="form-check mb-0">
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

        {/* Submit Button */}
        <div className="mt-3">
          <Placeholder
            as="button"
            className="btn btn-primary"
            style={{ width: "100px", height: "38px" }}
          />
        </div>
      </form>
    </Placeholder>
  );
});

EditRoleSkeleton.displayName = "EditRoleSkeleton";

export default EditRoleSkeleton;
