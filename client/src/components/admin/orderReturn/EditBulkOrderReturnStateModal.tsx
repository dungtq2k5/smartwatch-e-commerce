import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FormInput } from "../../../utils/types";
import { useReturnStore } from "../../../store/admin/orderReturn/orderReturnStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { ReturnStateResponse } from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { MODAL_CLOSE_DELAY_MS, WAITING_EMOJI } from "../../../configs";
import { LOOKUP_ID } from "../../../../../common/configs.common";
import { Button, Modal } from "react-bootstrap";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import Label from "../../common/Label";
import Textarea from "../../common/Textarea";
import Btn from "../../common/Btn";
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { EditOrderReturnStateModalType } from "./EditOrderReturnStateModal";

type EditBulkOrderReturnStateModalProps = Readonly<{
  type: EditOrderReturnStateModalType;
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
  notes: FormInput;
};

const DEFAULT_FORM_DATA: FormData = {
  notes: { val: "" },
};

const EditBulkOrderReturnStateModal = memo(
  ({
    type,
    returnIds,
    onHide,
    onSuccess,
  }: EditBulkOrderReturnStateModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(
      "EditBulkOrderReturnStateModal rendered count: ",
      renderCount.current,
    );

    const { returnStates, fetchReturnStates, getReturnStateByLookupId } =
      useReturnStateStore();
    const { updateReturnStateBulk } = useReturnStore();

    const canEditReturn = useHasPermission("u_order_return");

    const [submitState, setSubmitState] = useState<ReturnStateResponse | null>(
      null,
    );

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
            if (!returnStates) await fetchReturnStates();

            const submitState =
              type === "approve"
                ? getReturnStateByLookupId(LOOKUP_ID.RETURN_STATE.APPROVED)
                : type === "decline"
                  ? getReturnStateByLookupId(LOOKUP_ID.RETURN_STATE.DECLINED)
                  : getReturnStateByLookupId(LOOKUP_ID.RETURN_STATE.REFUNDING);
            if (!submitState) {
              throw new Error("Return submit state not found.");
            }
            setSubmitState(submitState);
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
    }, [returnIds, type]);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
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
          toast.error("No return selected to update.");
          return;
        }
        if (!submitState) {
          toast.error("Submit state data not found. Please try again.");
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
            await updateReturnStateBulk({
              returnIds,
              returnStateId: submitState.id,
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
        submitState,
        canEditReturn,
        formData,
        updateReturnStateBulk,
        onSuccess,
        onHide,
      ],
    );

    return (
      <Modal show={!!returnIds} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Bulk {capFirstLetter(type)} Return Request for {returnIds?.length || 0}{" "}
            Return(s)
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
        ) : !returnStates ? (
          <Modal.Body>
            <ApiError errorMessage="Return states data not found." />
          </Modal.Body>
        ) : !submitState ? (
          <Modal.Body>
            <ApiError errorMessage="Return submit state not found." />
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
                  <strong>Warning:</strong> This will{" "}
                  <strong>
                    {type} {returnIds?.length || 0} return(s) at once.
                  </strong>{" "}
                  Please make sure you have selected the correct returns before
                  proceeding. This action cannot be undone.
                </div>
              </div>

              <div className="mb-3">
                <Label htmlFor="stateId" className="form-label" required>
                  Return State
                </Label>
                <select
                  id="stateId"
                  name="stateId"
                  className="form-select"
                  value={submitState.id}
                  disabled={true}
                  required
                >
                  <option
                    key={submitState.id}
                    value={submitState.id}
                    title={submitState.description || undefined}
                  >
                    {capFirstLetter(submitState.name)}
                  </option>
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
                  placeholder="Add notes (optional)..."
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
                Submit {returnIds?.length || 0} Return(s)
              </Btn>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  },
);

export default EditBulkOrderReturnStateModal;
