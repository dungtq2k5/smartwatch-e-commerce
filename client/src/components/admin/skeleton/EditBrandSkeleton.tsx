import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const EditBrandSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow">
      {/* Title */}
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <div className="row">
        {/* Left Col */}
        <div className="col-lg-8">
          {/* General Info */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-25">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <Placeholder as="label" className="form-label w-25">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "38px" }} />
              </div>
              <div className="mb-3">
                <Placeholder as="label" className="form-label w-25">
                  <Placeholder xs={12} />
                </Placeholder>
                <Placeholder xs={12} style={{ height: "100px" }} />
              </div>
            </div>
          </div>

          {/* Add Info */}
          <div className="card shadow-sm">
             <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-25">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row">
                 {[1, 2, 3, 4].map((i) => (
                  <div className="col-md-6 mb-3" key={i}>
                    <Placeholder as="label" className="form-label w-50">
                      <Placeholder xs={12} />
                    </Placeholder>
                    <Placeholder xs={12} style={{ height: "38px" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col */}
        <div className="col-lg-4">
          {/* Logo */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="text-center">
                 <Placeholder className="rounded border mb-3" style={{ width: "150px", height: "150px" }} />
                 <Placeholder.Button className="w-100" />
              </div>
            </div>
          </div>
        </div>
      </div>

       <div className="d-flex justify-content-end gap-2 mt-4">
        <Placeholder.Button variant="secondary" style={{ width: "80px" }} />
        <Placeholder.Button variant="primary" style={{ width: "80px" }} />
      </div>
    </Placeholder>
  );
});

export default EditBrandSkeleton;
