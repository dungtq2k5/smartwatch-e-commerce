import { memo, useCallback, useEffect, useState } from "react";
import useDeliveryStateStore from "../../../store/common/order/deliveryStateStore";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import type { FormInput } from "../../../utils/types";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import Textarea from "../../common/Textarea";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import Loading from "../../common/Loading";
import Label from "../../common/Label";
import Btn from "../../common/Btn";
import { Button, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

type EditBulkOrderDeliveryStateModalProps = {
  orderIds?: string[] | null; // Only show when orderIds is provided
  onHide: () => void;
  onSuccess?: () => void;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

type FormData = {
  deliveryStateId: FormInput<string, undefined>;
  notes: FormInput;
};

const DEFAULT_FORM_DATA: FormData = {
  deliveryStateId: { val: "" },
  notes: { val: "" },
};

const EditBulkOrderDeliveryStateModal = memo(
  ({ orderIds, onHide, onSuccess }: EditBulkOrderDeliveryStateModalProps) => {
    const { deliveryStates, fetchDeliveryStates } = useDeliveryStateStore();
    const { updateOrderBulk } = useOrderStore();

    const canEditOrder = useHasPermission("u_order");

    const [process, setProcess] = useState<Process>({
      isProcessing: !deliveryStates,
      isInitializing: !deliveryStates,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

    // Fetch set initial data when first loading the modal
    useEffect(() => {
      if (orderIds) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          if (deliveryStates) return;

          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isInitializing: true,
          }));
          setApiErr(null);

          try {
            await fetchDeliveryStates();
          } catch (error) {
            setApiErr(formatError(error));
          } finally {
            setProcess((prev) => ({
              ...prev,
              isProcessing: false,
              isInitializing: false,
            }));
          }
        };

        handleFetchSetInitialData();
      }

      setTimeout(() => {
        setFormData(DEFAULT_FORM_DATA);
        setApiErr(null);
      }, 200); // Small delay to allow modal close animation before clearing data

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderIds]);

    const handleChange = useCallback(
      async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
      ): Promise<void> => {
        if (process.isProcessing) return;

        const { name, value: val } = e.target;

        // Only have notes field to check
        let err = undefined;
        if (val && name === "notes" && !removeOddSpaces(val)) {
          err = "Notes is invalid.";
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
          toast.error("No orders selected.");
          return;
        }
        if (!canEditOrder) {
          toast.error("You don't have permission to perform this action.");
          return;
        }

        const validateForm = (): boolean => {
          let isValid = true;
          const newFormData = { ...formData };

          if (formData.notes.val && !removeOddSpaces(formData.notes.val)) {
            newFormData.notes.err = "Notes is invalid.";
            isValid = false;
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
            await updateOrderBulk({
              orderIds,
              deliveryStateId: formData.deliveryStateId.val,
              notes: formData.notes.val || null,
            });
            onSuccess?.();
            onHide();
            toast.success(`${orderIds.length} order(s) updated successfully.`);
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
          <Modal.Title>Bulk Update Delivery State</Modal.Title>
        </Modal.Header>

        {process.isInitializing ? (
          <Modal.Body>
            <Loading loadingMsg="Loading delivery states" />
          </Modal.Body>
        ) : apiErr ? (
          <Modal.Body>
            <ApiError errorMessage={apiErr} />
          </Modal.Body>
        ) : !deliveryStates ? (
          <Modal.Body>
            <ApiError errorMessage="Delivery states data not found." />
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="alert alert-warning d-flex align-items-center mb-3">
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="me-2"
                />
                <div>
                  <strong>Warning:</strong> This will update{" "}
                  <strong>{orderIds?.length || 0}</strong> order(s) at once.
                  Please make sure you have selected the correct delivery state.
                </div>
              </div>

              <div className="mb-3">
                <Label
                  htmlFor="deliveryStateId"
                  className="form-label"
                  required
                >
                  Delivery State
                </Label>
                <select
                  id="deliveryStateId"
                  name="deliveryStateId"
                  className="form-select"
                  value={formData.deliveryStateId.val}
                  onChange={handleChange}
                  disabled={process.isProcessing}
                  required
                >
                  {deliveryStates.states.map((state) => (
                    <option
                      key={state.id}
                      value={state.id}
                      title={state.description || undefined}
                    >
                      {capFirstLetter(state.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <Label htmlFor="notes" className="form-label">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="form-control"
                  rows={3}
                  placeholder="Add notes for this bulk update (optional)..."
                  value={formData.notes.val}
                  onChange={handleChange}
                  error={formData.notes.err}
                  disabled={process.isProcessing}
                />
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
        )}
      </Modal>
    );
  },
);

export default EditBulkOrderDeliveryStateModal;
