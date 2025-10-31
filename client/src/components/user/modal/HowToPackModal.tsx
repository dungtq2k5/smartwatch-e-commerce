import { Button, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faPrint,
  faScissors,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import { memo, useRef } from "react";

const HowToPackModal = memo(
  ({
    show,
    onHide,
  }: Readonly<{
    show: boolean;
    onHide: () => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(`HowToPackModal render count: ${renderCount.current}`);

    return (
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>How to Pack Your Return</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="lead">
            Follow these simple steps to ensure your return is processed
            smoothly.
          </p>
          <div className="row g-4 mt-3">
            <div className="col-md-6 col-lg-3 text-center">
              <FontAwesomeIcon
                icon={faPrint}
                size="3x"
                className="text-primary mb-3"
              />
              <h3 className="h5">1. Print Label</h3>
              <p className="text-muted mb-0">
                Print the return label provided in your account.
              </p>
            </div>
            <div className="col-md-6 col-lg-3 text-center">
              <FontAwesomeIcon
                icon={faBox}
                size="3x"
                className="text-primary mb-3"
              />
              <h3 className="h5">2. Pack Items</h3>
              <p className="text-muted mb-0">
                Securely pack the items in their original packaging if possible.
              </p>
            </div>
            <div className="col-md-6 col-lg-3 text-center">
              <FontAwesomeIcon
                icon={faScissors}
                size="3x"
                className="text-primary mb-3"
              />
              <h3 className="h5">3. Attach Label</h3>
              <p className="text-muted mb-0">
                Firmly attach the return label to the outside of the package.
              </p>
            </div>
            <div className="col-md-6 col-lg-3 text-center">
              <FontAwesomeIcon
                icon={faTruck}
                size="3x"
                className="text-primary mb-3"
              />
              <h3 className="h5">4. Hand Over</h3>
              <p className="text-muted mb-0">
                Wait for the courier to pick up the package on the scheduled
                date.
              </p>
            </div>
          </div>
          <div className="alert alert-warning mt-4 mb-0" role="alert">
            <strong>Note:</strong> Please do not include any items that were not
            part of the original return request.
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="primary" onClick={onHide}>
            Got it!
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
);

export default HowToPackModal;
