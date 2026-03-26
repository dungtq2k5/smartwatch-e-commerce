import { memo, useCallback, useEffect, useState } from "react";
import useDeliveryStateStore from "../../../store/common/order/deliveryStateStore";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import type { FormInput } from "../../../utils/types";
import type {
  AdminOrderResponse,
  OrderUpdate,
} from "../../../../../common/types.common";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import Textarea from "../../common/Textarea";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import Loading from "../../common/Loading";
import Label from "../../common/Label";
import Btn from "../../common/Btn";
import { Button, Modal } from "react-bootstrap";

type EditOrderDeliveryStateModalProps = {
  orderId?: string | null; // Only show when orderId is provided
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

const EditOrderDeliveryStateModal = memo(
  ({ orderId, onHide, onSuccess }: EditOrderDeliveryStateModalProps) => {
    const { deliveryStates, fetchDeliveryStates } = useDeliveryStateStore();
    const { fetchOrder, updateOrder } = useOrderStore();

    const canEditOrder = useHasPermission("u_order");

    const [order, setOrder] = useState<AdminOrderResponse | null>(null);

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isInitializing: false,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

    // Fetch set initial data when first loading the modal
    useEffect(() => {
      if (orderId) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isInitializing: true,
          }));
          setApiErr(null);

          try {
            const [fetchedOrder] = await Promise.all([
              fetchOrder(orderId),
              deliveryStates ? Promise.resolve() : fetchDeliveryStates(),
            ]);

            setOrder(fetchedOrder);

            const copiedOrder = structuredClone(fetchedOrder);
            const currDeliveryState = copiedOrder.deliveryStates.at(-1);
            setFormData({
              deliveryStateId: {
                val: currDeliveryState?.id || "",
              },
              notes: {
                val: currDeliveryState?.notes || "",
              },
            });
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
        setOrder(null);
        setFormData(DEFAULT_FORM_DATA);
        setApiErr(null);
      }, 200); // Small delay to allow modal close animation before clearing data
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const handleChange = useCallback(
      async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
      ): Promise<void> => {
        if (process.isProcessing || !order) return;

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
      [process.isProcessing, order],
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
        if (!order) {
          toast.error("Order data not found. Please try again.");
          return;
        }
        if (!canEditOrder) {
          toast.error("You don't have permission to perform this action.");
          return;
        }

        const validateForm = (): boolean => {
          if (
            order.deliveryStates.at(-1)?.id === formData.deliveryStateId.val
          ) {
            // If state is not changed, no need to validate notes as it won't be updated
            return true;
          }

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
          const getChangedData = (): OrderUpdate => {
            const changedData: OrderUpdate = {};

            if (
              formData.deliveryStateId.val !== order.deliveryStates.at(-1)?.id
            ) {
              changedData.deliveryStateId = formData.deliveryStateId.val;

              if (formData.notes.val) changedData.notes = formData.notes.val;
            }

            return changedData;
          };

          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isUpdating: true,
          }));

          try {
            const changedData = getChangedData();
            if (Object.keys(changedData).length === 0) {
              toast.success("No changes detected. No update needed.");
              return;
            }

            await updateOrder(order.id, changedData);
            onSuccess?.();
            onHide();
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
        order,
        process.isProcessing,
        updateOrder,
      ],
    );

    return (
      <Modal show={!!orderId} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Update Delivery State for Order #ID {order?.id || orderId}
          </Modal.Title>
        </Modal.Header>

        {process.isInitializing ? (
          <Modal.Body>
            <Loading loadingMsg="Loading order data" />
          </Modal.Body>
        ) : apiErr ? (
          <Modal.Body>
            <ApiError errorMessage={apiErr} />
          </Modal.Body>
        ) : !deliveryStates ? (
          <Modal.Body>
            <ApiError errorMessage="Delivery states data not found." />
          </Modal.Body>
        ) : !order ? (
          <Modal.Body>
            <ApiError errorMessage="Order data not found." />
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
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

              {order.deliveryStates.at(-1)?.id !==
                formData.deliveryStateId.val && (
                <div className="mb-3">
                  <Label htmlFor="notes" className="form-label">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    className="form-control"
                    rows={3}
                    placeholder="Add notes for this delivery state change (optional)..."
                    value={formData.notes.val}
                    onChange={handleChange}
                    error={formData.notes.err}
                    disabled={process.isProcessing}
                  />
                </div>
              )}
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
                Update
              </Btn>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  },
);

export default EditOrderDeliveryStateModal;
