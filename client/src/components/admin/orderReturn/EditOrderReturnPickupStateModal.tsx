import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FormInput } from "../../../utils/types";
import usePickupStateStore from "../../../store/common/returnRefund/pickupStateStore";
import { useReturnStore } from "../../../store/admin/orderReturn/orderReturnStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  AdminOrderReturnResponse,
  OrderReturnPickupStateUpdate,
} from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import { Button, Modal } from "react-bootstrap";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import Label from "../../common/Label";
import Textarea from "../../common/Textarea";
import Btn from "../../common/Btn";

type EditOrderReturnPickupStateModalProps = Readonly<{
  returnId?: string | null; // Only show when returnId is provided
  onHide: () => void;
  onSuccess?: () => void;
}>;

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

type FormData = {
  pickupStateId: FormInput<string, undefined>;
  notes: FormInput;
};

const DEFAULT_FORM_DATA: FormData = {
  pickupStateId: { val: "" },
  notes: { val: "" },
};

const EditOrderReturnPickupStateModal = memo(
  ({ returnId, onHide, onSuccess }: EditOrderReturnPickupStateModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("EditOrderReturnPickupStateModal rendered count: ", renderCount.current);

    const { pickupStates, fetchPickupStates, getPickupState } =
      usePickupStateStore();
    const { getReturn, updateReturnPickupState, canUpdateReturnPickupState } =
      useReturnStore();

    const canEditReturn = useHasPermission("u_order_return");

    const [orderReturn, setOrderReturn] =
      useState<AdminOrderReturnResponse | null>(null);

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isInitializing: false,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

    // Fetch set initial data when first loading the modal
    useEffect(() => {
      if (returnId) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isInitializing: true,
          }));
          setApiErr(null);

          try {
            const [fetchedReturn] = await Promise.all([
              getReturn(returnId),
              pickupStates ? Promise.resolve() : fetchPickupStates(),
            ]);

            setOrderReturn(fetchedReturn);

            const copiedReturn = structuredClone(fetchedReturn);
            const currPickupState = copiedReturn.pickupStates.at(-1);
            setFormData({
              pickupStateId: {
                val: currPickupState?.id || "",
              },
              notes: {
                val: currPickupState?.notes || "",
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
        setOrderReturn(null);
        setFormData(DEFAULT_FORM_DATA);
        setApiErr(null);
      }, 200); // Small delay to allow modal close animation before clearing data
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [returnId]);

    const handleChange = useCallback(
      async (
        e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>,
      ): Promise<void> => {
        if (process.isProcessing || !orderReturn) return;

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
      [process.isProcessing, orderReturn],
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
        if (!orderReturn) {
          toast.error("Return data not found. Please try again.");
          return;
        }
        if (!canEditReturn) {
          toast.error("You don't have permission to perform this action.");
          return;
        }
        const currPickupStateId = orderReturn.pickupStates.at(-1)?.id;
        const currPickupState = currPickupStateId
          ? getPickupState(currPickupStateId)
          : undefined;
        if (
          !currPickupState ||
          !canUpdateReturnPickupState(currPickupState.lookupId)
        ) {
          toast.error(
            "This return is not in a state that allows pickup state update.",
          );
          return;
        }

        const validateForm = (): boolean => {
          if (currPickupStateId === formData.pickupStateId.val) {
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
          const getChangedData = (): OrderReturnPickupStateUpdate => {
            const changedData: OrderReturnPickupStateUpdate = {};

            if (formData.pickupStateId.val !== currPickupStateId) {
              changedData.pickupStateId = formData.pickupStateId.val;

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

            await updateReturnPickupState(orderReturn.id, changedData);
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
        canEditReturn,
        canUpdateReturnPickupState,
        formData,
        getPickupState,
        onHide,
        onSuccess,
        orderReturn,
        updateReturnPickupState,
        process.isProcessing,
      ],
    );

    return (
      <Modal show={!!returnId} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Update Pickup State for Return #ID {orderReturn?.id || returnId}
          </Modal.Title>
        </Modal.Header>

        {process.isInitializing ? (
          <Modal.Body>
            <Loading loadingMsg="Loading return data" />
          </Modal.Body>
        ) : apiErr ? (
          <Modal.Body>
            <ApiError errorMessage={apiErr} />
          </Modal.Body>
        ) : !pickupStates ? (
          <Modal.Body>
            <ApiError errorMessage="Pickup states data not found." />
          </Modal.Body>
        ) : !orderReturn ? (
          <Modal.Body>
            <ApiError errorMessage="Return data not found." />
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="mb-3">
                <Label htmlFor="pickupStateId" className="form-label" required>
                  Pickup State
                </Label>
                <select
                  id="pickupStateId"
                  name="pickupStateId"
                  className="form-select"
                  value={formData.pickupStateId.val}
                  onChange={handleChange}
                  disabled={process.isProcessing}
                  required
                >
                  {pickupStates.states.map((state) => (
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

              {orderReturn.pickupStates.at(-1)?.id !==
                formData.pickupStateId.val && (
                <div className="mb-3">
                  <Label htmlFor="notes" className="form-label">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    className="form-control"
                    rows={3}
                    placeholder="Add notes for this pickup state change (optional)..."
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

export default EditOrderReturnPickupStateModal;
