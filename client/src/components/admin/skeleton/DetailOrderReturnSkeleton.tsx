import { memo } from "react";
import { Placeholder, Accordion } from "react-bootstrap";

const DetailOrderReturnSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <div className="row g-4">
        {/* Left Column */}
        <div className="col-12 col-xl-4 col-md-5">
          {/* Return Info Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              {/* State badges */}
              <div className="mb-3 d-flex gap-2">
                <Placeholder
                  style={{ width: "80px", height: "24px" }}
                  className="rounded-pill"
                />
                <Placeholder
                  style={{ width: "90px", height: "24px" }}
                  className="rounded-pill"
                />
                <Placeholder
                  style={{ width: "70px", height: "24px" }}
                  className="rounded-pill"
                />
              </div>

              <hr className="opacity-25" />

              <div className="row">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div className="col-sm-6 mb-3" key={i}>
                    <Placeholder as="span" className="d-block w-50 mb-1">
                      <Placeholder xs={12} />
                    </Placeholder>
                    <Placeholder xs={i % 2 === 0 ? 10 : 8} />
                  </div>
                ))}
              </div>

              <hr className="opacity-25" />

              {/* Refund Summary */}
              <div className="mb-3">
                <Placeholder className="d-block mb-2">
                  <Placeholder xs={4} />
                </Placeholder>
                <div className="row g-2">
                  <div className="col-6">
                    <Placeholder xs={12} style={{ height: "40px" }} />
                  </div>
                  <div className="col-6">
                    <Placeholder xs={12} style={{ height: "40px" }} />
                  </div>
                  <div className="col-12 pt-2 mt-2">
                    <Placeholder xs={12} style={{ height: "30px" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-12 col-xl-8 col-md-7">
          {/* Items Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 mb-0 w-25">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`d-flex gap-3 pb-3 ${i === 1 ? "mb-3 border-bottom" : ""}`}
                >
                  <Placeholder
                    className="product-img--g rounded flex-shrink-0"
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
                    <br />
                    <Placeholder style={{ width: "55px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Images Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 mb-0 w-25">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="col-6 col-md-4">
                    <Placeholder
                      className="img-fluid rounded w-100"
                      style={{ height: "150px" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pickup Address Card */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white py-3">
              <Placeholder as="h2" className="fs-5 mb-0 w-25">
                <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              <Placeholder as="p" className="fw-semibold mb-1">
                <Placeholder xs={5} />
              </Placeholder>
              <Placeholder as="p" className="mb-1">
                <Placeholder xs={4} />
              </Placeholder>
              <Placeholder as="p" className="mb-3">
                <Placeholder xs={10} />
              </Placeholder>
              <Placeholder
                style={{ width: "80px", height: "30px" }}
                className="rounded"
              />
            </div>
          </div>

          {/* Three Timeline Accordions */}
          <Accordion defaultActiveKey={["0", "1", "2"]} alwaysOpen>
            {/* Return State History */}
            {[0, 1, 2].map((cardIdx) => (
              <Accordion.Item
                key={cardIdx}
                eventKey={cardIdx.toString()}
                className="shadow-sm mb-3 border-0"
                style={{ marginBottom: cardIdx === 2 ? 0 : undefined }}
              >
                <Accordion.Header className="bg-white">
                  <Placeholder as="h2" className="fs-5 mb-0 w-50">
                    <Placeholder xs={12} />
                  </Placeholder>
                </Accordion.Header>
                <Accordion.Body className="bg-white">
                  {cardIdx === 0 && (
                    <div className="d-flex justify-content-end gap-2 mb-3">
                      <Placeholder
                        style={{ width: "40px", height: "36px" }}
                        className="rounded"
                      />
                      <Placeholder
                        style={{ width: "40px", height: "36px" }}
                        className="rounded"
                      />
                      <Placeholder
                        style={{ width: "40px", height: "36px" }}
                        className="rounded"
                      />
                    </div>
                  )}
                  {cardIdx === 2 && (
                    <div className="d-flex justify-content-end mb-3">
                      <Placeholder
                        style={{ width: "40px", height: "36px" }}
                        className="rounded"
                      />
                    </div>
                  )}
                  <div className="mt-2">
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
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </div>
    </Placeholder>
  );
});

DetailOrderReturnSkeleton.displayName = "DetailOrderReturnSkeleton";

export default DetailOrderReturnSkeleton;
