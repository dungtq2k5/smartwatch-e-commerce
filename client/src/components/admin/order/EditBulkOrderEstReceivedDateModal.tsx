import { memo, useCallback, useEffect, useState } from "react";
import {
  formatError,
  getLocalDateString,
} from "../../../../../common/utils.common";
import type { FormInput } from "../../../utils/types";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import Input from "../../common/Input";
import toast from "react-hot-toast";
import { WAITING_EMOJI, MODAL_CLOSE_DELAY_MS } from "../../../configs";
import Label from "../../common/Label";
import Btn from "../../common/Btn";
import { Button, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

type EditBulkOrderEstReceivedDateModalProps = Readonly<{
  orderIds?: string[] | null; // Only show when orderIds is provided
  onHide: () => void;
  onSuccess?: () => void;
}>;

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

type FormData = {
  estimateReceivedDate: FormInput;
};

const DEFAULT_FORM_DATA: FormData = {
  estimateReceivedDate: { val: new Date().toISOString().split("T")[0] }, // Default to today's date in YYYY-MM-DD format
};

const EditBulkOrderEstReceivedDateModal = memo(
  ({ orderIds, onHide, onSuccess }: EditBulkOrderEstReceivedDateModalProps) => {
    const { updateOrderBulk } = useOrderStore();

    const canEditOrder = useHasPermission("u_order");

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isInitializing: false,
      isUpdating: false,
    });

    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

    // Reset form data whenever orderIds changes
    useEffect(() => {
      setTimeout(() => {
        setFormData(DEFAULT_FORM_DATA);
      }, MODAL_CLOSE_DELAY_MS); // Small delay to allow modal close animation before clearing data
    }, [orderIds]);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        if (process.isProcessing) return;

        const { name, value: val } = e.target;

        let err = undefined;
        if (val && name === "estimateReceivedDate") {
          const inputDate = new Date(val);
          if (Number.isNaN(inputDate.getTime())) {
            err = "Estimated received date is invalid.";
          } else if (inputDate < new Date()) {
            err = "Estimated received date must be in the future.";
          }
        }

        setFormData((prev) => ({
          ...prev,
          [name]: { val, err },
        }));
      },
      [process.isProcessing],
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (process.isProcessing) {
          toast("Another action is in progress. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }
        if (!orderIds) {
          toast.error("No order selected. Please try again.");
          return;
        }
        if (!canEditOrder) {
          toast.error("You don't have permission to perform this action.");
          return;
        }

        const validateForm = (): boolean => {
          let isValid = true;
          const newFormData = { ...formData };

          if (formData.estimateReceivedDate.val) {
            const inputDate = new Date(formData.estimateReceivedDate.val);
            if (Number.isNaN(inputDate.getTime())) {
              newFormData.estimateReceivedDate.err =
                "Estimated received date is invalid.";
              isValid = false;
            } else if (inputDate < new Date()) {
              newFormData.estimateReceivedDate.err =
                "Estimated received date must be in the future.";
              isValid = false;
            }
          }

          setFormData(newFormData);
          return isValid;
        };

        if (validateForm()) {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isUpdating: true,
          }));

          try {
            // Since there is only one field to update, we implement the logic directly here without the getChangedData function
            await updateOrderBulk({
              orderIds,
              estimateReceivedDate: new Date(
                formData.estimateReceivedDate.val,
              ).toISOString(),
            });
            onHide();
            onSuccess?.();
            toast.success("Order updated successfully.");
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setProcess((prev) => ({
              ...prev,
              isProcessing: false,
              isUpdating: false,
            }));
          }
        }
      },
      [
        canEditOrder,
        formData,
        onHide,
        onSuccess,
        orderIds,
        process.isProcessing,
        updateOrderBulk,
      ],
    );

    return (
      <Modal show={!!orderIds} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Bulk Update Est Received Date for {orderIds?.length || 0} Order(s)
          </Modal.Title>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="alert alert-warning d-flex align-items-center mb-3">
              <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
              <div>
                <strong>Warning:</strong> This will update{" "}
                <strong>{orderIds?.length || 0}</strong> order(s) at once.
                Please make sure you have selected the correct date.
              </div>
            </div>

            <div className="mb-3">
              <Label
                htmlFor="estimateReceivedDate"
                className="form-label"
                required
              >
                Estimated Received Date
              </Label>
              <Input
                type="date"
                id="estimateReceivedDate"
                name="estimateReceivedDate"
                className="form-control"
                value={getLocalDateString(formData.estimateReceivedDate.val)}
                onChange={handleChange}
                min={getLocalDateString(new Date())}
                error={formData.estimateReceivedDate.err}
                disabled={process.isProcessing}
                required
              />
              <small className="text-muted">
                Select the expected delivery date for these orders.
              </small>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="button"
              variant="secondary"
              onClick={onHide}
              disabled={process.isProcessing}
            >
              Cancel
            </Button>
            <Btn
              type="submit"
              className="btn btn-primary"
              disabled={process.isProcessing}
              loading={process.isUpdating}
            >
              Update {orderIds?.length || 0} Order(s)
            </Btn>
          </Modal.Footer>
        </form>
      </Modal>
    );
  },
);

export default EditBulkOrderEstReceivedDateModal;
