import { Modal, Button } from "react-bootstrap";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ConfirmDeleteModal({
  title,
  show,
  onHide,
  onDelete,
}: Readonly<{
  title: string;
  show: boolean;
  onHide: () => void;
  onDelete: () => Promise<void>;
}>) {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("ConfirmDeleteModal render count:", renderCount.current);

  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when modal is hidden
  useEffect(() => {
    if (!show) {
      setTimeout(() => {
        setIsDeleting(false);
      }, 200); // Delay to allow modal to close before resetting
    }
  }, [show]);

  const handleDelete = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    try {
      await onDelete();
      onHide(); // Close modal after successful deletion
    } catch {
      // The error is handled in the parent component
      // The modal remains open for the user to try again or cancel.
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, onHide, setIsDeleting]);

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Deletion</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>{title}</p>
      </Modal.Body>

      <Modal.Footer>
        <Button
          type="button"
          variant="secondary"
          onClick={onHide}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              ></span>
              <output>Deleting...</output>
            </>
          ) : (
            "Delete"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
