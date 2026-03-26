import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FormInput } from "../../../utils/types";
import usePickupStateStore from "../../../store/common/returnRefund/pickupStateStore";
import { useReturnStore } from "../../../store/admin/orderReturn/orderReturnStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { WAITING_EMOJI, MODAL_CLOSE_DELAY_MS } from "../../../configs";
import { Button, Modal } from "react-bootstrap";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import Label from "../../common/Label";
import Textarea from "../../common/Textarea";
import Btn from "../../common/Btn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

type EditBulkOrderReturnPickupStateModalProps = Readonly<{
  returnIds?: string[] | null; // Only show when returnIds is provided
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

const EditBulkOrderReturnPickupStateModal = memo(
  ({
    returnIds,
    onHide,
    onSuccess,
  }: EditBulkOrderReturnPickupStateModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(
      "EditBulkOrderReturnPickupStateModal rendered count: ",
      renderCount.current,
    );

    const { pickupStates, fetchPickupStates } = usePickupStateStore();
    const { updateReturnPickupStateBulk } = useReturnStore();

    const canEditReturn = useHasPermission("u_order_return");

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isInitializing: false,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

    // Fetch set initial data when first loading the modal
    useEffect(() => {
      if (returnIds) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isInitializing: true,
          }));
          setApiErr(null);

          try {
            if (!pickupStates) await fetchPickupStates();
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
      }, MODAL_CLOSE_DELAY_MS); // Small delay to allow modal close animation before clearing data
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [returnIds]);

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
        if (!returnIds || returnIds.length === 0) {
          toast.error("No return selected for update.");
          return;
        }
        if (!canEditReturn) {
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
            await updateReturnPickupStateBulk({
              returnIds,
              pickupStateId: formData.pickupStateId.val,
              notes: formData.notes.val || undefined,
            });
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
        process.isProcessing,
        returnIds,
        canEditReturn,
        formData,
        updateReturnPickupStateBulk,
        onSuccess,
        onHide,
      ],
    );

    return (
      <Modal show={!!returnIds} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Bulk Update Pickup State for {returnIds?.length || 0} Return(s)
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
                  <strong>{returnIds?.length || 0}</strong> return(s) at once.
                  Please make sure you have selected the correct return state.
                </div>
              </div>

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

              <div className="mb-3">
                <Label htmlFor="notes" className="form-label">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="form-control"
                  rows={3}
                  placeholder="Add notes for this state change (optional)..."
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
                Update {returnIds?.length || 0} Return(s)
              </Btn>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  },
);

export default EditBulkOrderReturnPickupStateModal;
