import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FormInput } from "../../../utils/types";
import { useReturnStore } from "../../../store/admin/orderReturn/orderReturnStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  ReturnStateResponse,
  AdminOrderReturnResponse,
} from "../../../../../common/types.common";
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
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";

export type EditOrderReturnStateModalType = "approve" | "decline" | "refund";

type EditOrderReturnStateModalProps = Readonly<{
  type: EditOrderReturnStateModalType;
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
  notes: FormInput;
};

const DEFAULT_FORM_DATA: FormData = {
  notes: { val: "" },
};

const EditOrderReturnStateModal = memo(
  ({ type, returnId, onHide, onSuccess }: EditOrderReturnStateModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(
      "EditOrderReturnStateModal rendered count: ",
      renderCount.current,
    );

    const {
      returnStates,
      fetchReturnStates,
      getReturnState,
      getReturnStateByLookupId,
    } = useReturnStateStore();
    const {
      getReturn,
      updateReturnState,
      canApproveReturn,
      canDeclineReturn,
      canRefundReturn,
    } = useReturnStore();

    const canEditReturn = useHasPermission("u_order_return");

    const [orderReturn, setOrderReturn] =
      useState<AdminOrderReturnResponse | null>(null);
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
              returnStates ? Promise.resolve() : fetchReturnStates(),
            ]);

            setOrderReturn(fetchedReturn);

            const submitState =
              type === "approve"
                ? getReturnStateByLookupId("2") // approved
                : type === "decline"
                  ? getReturnStateByLookupId("8") // declined
                  : getReturnStateByLookupId("5"); // refunding
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
        setOrderReturn(null);
        setFormData(DEFAULT_FORM_DATA);
        setApiErr(null);
      }, MODAL_CLOSE_DELAY_MS); // Small delay to allow modal close animation before clearing data
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [returnId]);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
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
        if (!submitState) {
          toast.error("Submit state data not found. Please try again.");
          return;
        }
        if (!canEditReturn) {
          toast.error("You don't have permission to perform this action.");
          return;
        }

        const currStateId = orderReturn.states.at(-1)?.id;
        const currState = currStateId ? getReturnState(currStateId) : undefined;
        if (!currState) {
          toast.error("Current return state not found. Please try again.");
          return;
        }
        switch (type) {
          case "approve":
            if (!canApproveReturn(currState.lookupId)) {
              toast.error(
                "This return cannot be approved from its current state.",
              );
              return;
            }
            break;
          case "decline":
            if (!canDeclineReturn(currState.lookupId)) {
              toast.error(
                "This return cannot be declined from its current state.",
              );
              return;
            }
            break;
          case "refund":
            if (!canRefundReturn(currState.lookupId)) {
              toast.error(
                "This return cannot be refunded from its current state.",
              );
              return;
            }
            break;
          default:
            toast.error(`Invalid action type: ${type}`);
            return;
        }

        const validateForm = (): boolean => {
          if (currStateId === submitState.id) {
            toast.success(
              `Return is already in the "${submitState.name}" state. No changes made.`,
            );
            return false;
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
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isUpdating: true,
          }));

          try {
            await updateReturnState(orderReturn.id, {
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
        orderReturn,
        submitState,
        canEditReturn,
        getReturnState,
        type,
        canApproveReturn,
        canDeclineReturn,
        canRefundReturn,
        formData,
        updateReturnState,
        onSuccess,
        onHide,
      ],
    );

    return (
      <Modal show={!!returnId} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {capFirstLetter(type)} Return Request for Return #ID{" "}
            {orderReturn?.id || returnId}
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
        ) : !orderReturn ? (
          <Modal.Body>
            <ApiError errorMessage="Return data not found." />
          </Modal.Body>
        ) : !submitState ? (
          <Modal.Body>
            <ApiError errorMessage="Return submit state not found." />
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
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
                Submit
              </Btn>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  },
);

export default EditOrderReturnStateModal;
