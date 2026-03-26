import { memo, useCallback, useEffect, useState } from "react";
import {
  formatError,
  getLocalDateString,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import type { FormInput } from "../../../utils/types";
import type { AdminOrderResponse } from "../../../../../common/types.common";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import Input from "../../common/Input";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import Loading from "../../common/Loading";
import Label from "../../common/Label";
import Btn from "../../common/Btn";
import { Button, Modal } from "react-bootstrap";
import useDeliveryStateStore from "../../../store/common/order/deliveryStateStore";

type EditOrderEstReceivedDateModalProps = Readonly<{
  orderId?: string | null; // Only show when orderId is provided
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
  estimateReceivedDate: { val: "" },
};

const EditOrderEstReceivedDateModal = memo(
  ({ orderId, onHide, onSuccess }: EditOrderEstReceivedDateModalProps) => {
    const { deliveryStates, fetchDeliveryStates, getDeliveryState } =
      useDeliveryStateStore();
    const { fetchOrder, updateOrder, canUpdateOrder } = useOrderStore();

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
            setFormData({
              estimateReceivedDate: {
                val: copiedOrder.estimateReceivedDate,
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
      async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        if (process.isProcessing || !order) return;

        const { name, value: val } = e.target;

        let err = undefined;
        if (val && name === "estimateReceivedDate") {
          const inputDate = new Date(val);
          if (Number.isNaN(inputDate.getTime())) {
            err = "Estimated received date is invalid.";
          } else if (inputDate < new Date()) {
            err = "Estimated received date must be in the future.";
          } else if (inputDate < new Date(order.createdAt)) {
            err =
              "Estimated received date must be greater than order created date.";
          }
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
        const currDeliveryStateId = order.deliveryStates.at(-1)?.id;
        const currDeliveryState = currDeliveryStateId
          ? getDeliveryState(currDeliveryStateId)
          : undefined;
        if (!currDeliveryState || !canUpdateOrder(currDeliveryState.lookupId)) {
          toast.error("This order is completed and cannot be edited.");
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
            } else if (inputDate < new Date(order.createdAt)) {
              newFormData.estimateReceivedDate.err =
                "Estimated received date must be greater than order created date.";
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
            if (
              getLocalDateString(formData.estimateReceivedDate.val) ===
              getLocalDateString(order.estimateReceivedDate)
            ) {
              toast.success("No changes detected. No update needed.");
              return;
            }

            await updateOrder(order.id, {
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
        canUpdateOrder,
        formData,
        getDeliveryState,
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
            Update Est Received Date for Order #ID {order?.id || orderId}
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
        ) : !order ? (
          <Modal.Body>
            <ApiError errorMessage="Order data not found." />
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
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
                  Select the expected delivery date for this order.
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
                Update
              </Btn>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  },
);

export default EditOrderEstReceivedDateModal;
