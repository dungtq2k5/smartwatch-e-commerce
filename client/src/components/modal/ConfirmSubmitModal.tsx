import { Modal, Button } from "react-bootstrap";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../configs";

const ConfirmSubmitModal = memo(
  ({
    show,
    onHide,
    onSubmit,
    custom,
  }: Readonly<{
    show: boolean;
    onHide: () => void;
    onSubmit: () => Promise<void>;
    custom?: Partial<{
      action: "update" | "delete";
      title: string;
      body: string;
      cancelText: string;
      submitText: string;
    }>;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("ConfirmSubmitModal render count:", renderCount.current);

    const title = custom?.title || "Confirm Submission";
    const body = custom?.body || "Are you sure you want to submit?";
    const cancelText = custom?.cancelText || "Cancel";
    const submitText = custom?.submitText || "Submit";

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when modal is hidden
    useEffect(() => {
      if (!show) {
        setTimeout(() => {
          setIsSubmitting(false);
        }, 200); // Delay to allow modal to close before resetting
      }
    }, [show]);

    const handleSubmit = useCallback(async (): Promise<void> => {
      if (isSubmitting) {
        toast("Submission is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit();
        onHide(); // Close modal after successful submission
      } catch {
        // The error is handled in the parent component
        // The modal remains open for the user to try again or cancel.
      } finally {
        setIsSubmitting(false);
      }
    }, [isSubmitting, onSubmit, onHide]);

    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="mb-0">{body}</p>
        </Modal.Body>

        <Modal.Footer>
          <Button
            type="button"
            variant="secondary"
            onClick={onHide}
            disabled={isSubmitting}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={`${custom?.action === "delete" ? "danger" : "primary"}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>{submitText}...</output>
              </>
            ) : (
              submitText
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
);

export default ConfirmSubmitModal;
