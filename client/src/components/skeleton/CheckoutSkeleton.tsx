export default function CheckoutSkeleton() {
  return (
    <div className="row">
      {/* Left column skeleton */}
      <div className="col-md-8">
        {/* Delivery address card skeleton */}
        <div className="card shadow--g mb-4">
          <div className="card-header bg-white py-3 placeholder-glow">
            <span className="placeholder col-4" style={{ height: "1.5rem" }} />
          </div>
          <div className="card-body placeholder-glow">
            <span className="placeholder col-10" />
          </div>
        </div>

        {/* Payment method card skeleton */}
        <div className="card shadow--g">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div className="h5 mb-0 placeholder-glow w-50">
              <span
                className="placeholder col-6"
                style={{ height: "1.5rem" }}
              />
            </div>
            <div className="d-flex gap-2 placeholder-glow">
              <span
                className="placeholder"
                style={{ width: "60px", height: "31px" }}
              />
              <span
                className="placeholder"
                style={{ width: "60px", height: "31px" }}
              />
            </div>
          </div>
          <div className="card-body placeholder-glow">
            <span className="placeholder col-12" />
          </div>
        </div>
      </div>

      {/* Right column skeleton */}
      <div className="col-md-4">
        <div className="card shadow--g">
          <div className="card-header bg-white py-3 placeholder-glow">
            <span className="placeholder col-6" style={{ height: "1.5rem" }} />
          </div>
          <div className="card-body placeholder-glow">
            <div className="d-flex justify-content-between mb-2">
              <span className="placeholder col-4" />
              <span className="placeholder col-3" />
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="placeholder col-4" />
              <span className="placeholder col-2" />
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span className="placeholder col-5" />
              <span className="placeholder col-2" />
            </div>
            <hr />
            <div className="d-flex justify-content-between h5 mb-4">
              <span className="placeholder col-5" />
              <span className="placeholder col-3" />
            </div>
            <div
              className="placeholder col-12"
              style={{ height: "48px" }}
            ></div>
          </div>
          <ul className="list-group list-group-flush">
            {[...Array(2)].map((_, index) => (
              <li
                key={index}
                className="list-group-item d-flex align-items-center"
              >
                <div
                  className="placeholder me-3"
                  style={{ width: "60px", height: "60px" }}
                ></div>
                <div className="flex-grow-1 placeholder-glow">
                  <span className="placeholder col-8 d-block mb-1" />
                  <span className="placeholder col-6 d-block mb-1" />
                  <span className="placeholder col-4 d-block" />
                </div>
                <div className="text-end placeholder-glow w-25">
                  <span className="placeholder col-12" />
                </div>
              </li>
            ))}
          </ul>
          <div className="card-footer bg-white text-center placeholder-glow">
            <span className="placeholder col-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
