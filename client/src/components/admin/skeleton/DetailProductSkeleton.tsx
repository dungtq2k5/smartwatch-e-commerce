import { memo } from "react";
import { Accordion, Placeholder, Tab, Tabs } from "react-bootstrap";

const DetailProductSkeleton = memo(() => {
  return (
    <>
      {/* Heading */}
      <div className="mb-4">
        <Placeholder as="h1" animation="glow" className="h3 mb-1">
          <Placeholder xs={6} />
        </Placeholder>
        <Placeholder
          as="div"
          animation="glow"
          className="d-flex align-items-center text-muted small"
        >
          <Placeholder xs={2} /> <span className="mx-2">|</span>{" "}
          <Placeholder xs={2} /> <span className="mx-2">|</span>{" "}
          <Placeholder xs={1} />
        </Placeholder>
        <Placeholder as="p" animation="glow" className="mt-2">
          <Placeholder xs={12} />
        </Placeholder>
        <Placeholder
          as="div"
          animation="glow"
          className="d-flex align-items-center gap-2"
        >
          <Placeholder.Button xs={2} variant="secondary" />
          <span className="text-muted">|</span>
          <Placeholder xs={4} />
          <span className="text-muted">|</span>
          <Placeholder xs={4} />
        </Placeholder>
      </div>

      {/* Main Content */}
      <div className="row g-4">
        {/* Left: Images */}
        <div className="col-lg-5">
          <div className="card">
            <div className="card-body">
              <Placeholder animation="glow">
                <Placeholder
                  className="admin-detail-img--g mb-3"
                  style={{ height: "25em" }}
                />
              </Placeholder>
              <div className="d-flex flex-row justify-content-center gap-2 overflow-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Placeholder key={i+1} animation="glow">
                    <Placeholder className="product-detail-thumb-img--g" />
                  </Placeholder>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Details & Data */}
        <div className="col-lg-7">
          {/* Model Picker */}
          <div className="mb-3">
            <Placeholder as="h2" animation="glow" className="h5 mb-2">
              <Placeholder xs={3} />
            </Placeholder>
            <div className="d-flex flex-wrap gap-2">
              <Placeholder.Button xs={2} variant="primary" />
              <Placeholder.Button xs={2} variant="outline-primary" />
              <Placeholder.Button xs={2} variant="outline-primary" />
            </div>
          </div>

          {/* Variation Picker */}
          <div className="mb-4">
            <Placeholder as="h2" animation="glow" className="h5 mb-2">
              <Placeholder xs={4} />
            </Placeholder>
            <div className="d-flex flex-wrap gap-2">
              <Placeholder.Button xs={3} variant="primary" />
              <Placeholder.Button xs={3} variant="outline-primary" />
            </div>
          </div>

          {/* Details Tabs */}
          <Tabs defaultActiveKey="overview" className="mb-3" fill>
            <Tab eventKey="overview" title="Overview">
              <Placeholder animation="glow">
                <Placeholder xs={12} size="lg" />
                <Placeholder xs={12} />
                <Placeholder xs={12} size="sm" />
                <Placeholder xs={12} size="lg" />
                <Placeholder xs={12} />
                <Placeholder xs={12} size="sm" />
              </Placeholder>
            </Tab>
            <Tab eventKey="specs" title="Specifications">
              <Accordion defaultActiveKey="0">
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <Placeholder animation="glow" as="div" className="w-100">
                      <Placeholder xs={4} />
                    </Placeholder>
                  </Accordion.Header>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header>
                    <Placeholder animation="glow" as="div" className="w-100">
                      <Placeholder xs={5} />
                    </Placeholder>
                  </Accordion.Header>
                </Accordion.Item>
                <Accordion.Item eventKey="2">
                  <Accordion.Header>
                    <Placeholder animation="glow" as="div" className="w-100">
                      <Placeholder xs={3} />
                    </Placeholder>
                  </Accordion.Header>
                </Accordion.Item>
              </Accordion>
            </Tab>
            <Tab eventKey="images" title="Images">
              <Placeholder animation="glow">
                <Placeholder xs={4} />
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Placeholder
                    className="product-detail-thumb-img--g"
                    style={{ width: "4em", height: "4em" }}
                  />
                  <Placeholder
                    className="product-detail-thumb-img--g"
                    style={{ width: "4em", height: "4em" }}
                  />
                </div>
              </Placeholder>
            </Tab>
            <Tab eventKey="audit" title="Audit Trail">
              <Placeholder animation="glow">
                <Placeholder xs={12} size="sm" />
                <Placeholder xs={12} />
              </Placeholder>
            </Tab>
          </Tabs>
        </div>
      </div>
    </>
  );
});

export default DetailProductSkeleton;
