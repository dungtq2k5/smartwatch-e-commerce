import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { FormInput } from "../../../utils/types";
import useWithdrawalRequestStore from "../../../store/admin/withdrawalRequestStore";
import useWithdrawalStateStore from "../../../store/common/withdrawalStateStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  AdminWithdrawalRequestResponse,
  ApproveWithdrawalRequest,
  RejectWithdrawalRequest,
  WithdrawalStateResponse,
} from "../../../../../common/types.common";
import { LOOKUP_ID } from "../../../../../common/configs.common";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { MODAL_CLOSE_DELAY_MS, WAITING_EMOJI } from "../../../configs";
import toast from "react-hot-toast";
import { Button, Modal } from "react-bootstrap";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import Label from "../../common/Label";
import Textarea from "../../common/Textarea";
import Btn from "../../common/Btn";

export type EditWithdrawalRequestStateModalType = "approve" | "reject";

type EditWithdrawalRequestStateModalProps = Readonly<{
  type: EditWithdrawalRequestStateModalType;
  requestId?: string | null; // Only show when requestId is provided
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

const EditWithdrawalRequestStateModal = memo(
  ({
    type,
    requestId,
    onHide,
    onSuccess,
  }: EditWithdrawalRequestStateModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(
      "EditWithdrawalRequestStateModal rendered count: ",
      renderCount.current,
    );

    const {
      fetchWithdrawalRequest,
      approveWithdrawalRequest,
      rejectWithdrawalRequest,
      canApproveRequest,
      canRejectRequest,
    } = useWithdrawalRequestStore();
    const {
      withdrawalStates,
      fetchWithdrawalStates,
      getWithdrawalState,
      getWithdrawalStateByLookupId,
    } = useWithdrawalStateStore();

    const canEditRequest = useHasPermission("u_withdrawal_req");

    const [request, setRequest] =
      useState<AdminWithdrawalRequestResponse | null>(null);
    const [submitState, setSubmitState] =
      useState<WithdrawalStateResponse | null>(null);

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isInitializing: false,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

    // Fetch set initial data when first loading the modal
    useEffect(() => {
      if (requestId) {
        const handleFetchSetInitialData = async (): Promise<void> => {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isInitializing: true,
          }));
          setApiErr(null);

          try {
            const [fetchedRequest] = await Promise.all([
              fetchWithdrawalRequest(requestId),
              withdrawalStates ? Promise.resolve() : fetchWithdrawalStates(), // Only fetch withdrawal states if not already fetched
            ]);

            setRequest(fetchedRequest);

            const submitState =
              type === "approve"
                ? getWithdrawalStateByLookupId(
                    LOOKUP_ID.WITHDRAWAL_STATE.APPROVED,
                  )
                : getWithdrawalStateByLookupId(
                    LOOKUP_ID.WITHDRAWAL_STATE.REJECTED,
                  );
            if (!submitState) {
              throw new Error("Withdrawal request submit state not found.");
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
        setRequest(null);
        setFormData(DEFAULT_FORM_DATA);
        setApiErr(null);
      }, MODAL_CLOSE_DELAY_MS); // Small delay to allow modal close animation before clearing data
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId]);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
        if (process.isProcessing || !request) return;

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
      [process.isProcessing, request],
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
        if (!request) {
          toast.error("Request data not found. Please try again.");
          return;
        }
        if (!canEditRequest) {
          toast.error("You don't have permission to perform this action.");
          return;
        }

        const currStateId = request.states.at(-1)?.id;
        const currState = currStateId
          ? getWithdrawalState(currStateId)
          : undefined;
        if (!currState) {
          toast.error("Current request state not found. Please try again.");
          return;
        }
        switch (type) {
          case "approve":
            if (!canApproveRequest(currState.lookupId)) {
              toast.error(
                "This request cannot be approved from its current state.",
              );
              return;
            }
            break;
          case "reject":
            if (!canRejectRequest(currState.lookupId)) {
              toast.error(
                "This request cannot be rejected from its current state.",
              );
              return;
            }
            break;
          default:
            toast.error(`Invalid action type: ${type}`);
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
            const submitData:
              | ApproveWithdrawalRequest
              | RejectWithdrawalRequest = {
              notes: formData.notes.val || undefined,
            };

            if (type === "approve") {
              await approveWithdrawalRequest(request.id, submitData);
            } else {
              await rejectWithdrawalRequest(request.id, submitData);
            }

            onSuccess?.();
            onHide();
            toast.success("Request updated successfully.");
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
        request,
        canEditRequest,
        getWithdrawalState,
        type,
        canApproveRequest,
        canRejectRequest,
        formData,
        onSuccess,
        onHide,
        approveWithdrawalRequest,
        rejectWithdrawalRequest,
      ],
    );

    return (
      <Modal show={!!requestId} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {capFirstLetter(type)} Withdrawal Request for Request #ID{" "}
            {request?.id || requestId}
          </Modal.Title>
        </Modal.Header>

        {process.isInitializing ? (
          <Modal.Body>
            <Loading loadingMsg="Loading request data" />
          </Modal.Body>
        ) : apiErr ? (
          <Modal.Body>
            <ApiError errorMessage={apiErr} />
          </Modal.Body>
        ) : !withdrawalStates ? (
          <Modal.Body>
            <ApiError errorMessage="Withdrawal states data not found." />
          </Modal.Body>
        ) : !submitState ? (
          <Modal.Body>
            <ApiError errorMessage="Submit state data not found." />
          </Modal.Body>
        ) : !request ? (
          <Modal.Body>
            <ApiError errorMessage="Request data not found." />
          </Modal.Body>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="mb-3">
                <Label htmlFor="stateId" className="form-label" required>
                  Request State
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

export default EditWithdrawalRequestStateModal;
