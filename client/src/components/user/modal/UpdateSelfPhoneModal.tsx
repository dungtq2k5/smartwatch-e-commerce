import { memo, useCallback, useEffect, useRef, useState } from "react";
import useAuthStore from "../../../store/user/authStore";
import type { FormInput } from "../../../utils/types";
import { Button, Modal } from "react-bootstrap";
import {
  formatError,
  isValidVnPhoneNumber,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import type { UserContactInfoUpdate } from "../../../../../common/types.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import VerifyForm from "../../user/VerifyForm";
import { WAITING_EMOJI } from "../../../configs";
import Btn from "../../common/Btn";

const UpdateSelfPhoneModal = memo(
  ({
    show,
    onHide,
  }: Readonly<{
    show: boolean;
    onHide: () => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("UpdateSelfPhoneModal render count:", renderCount.current);

    const { updateSelfContactInfo } = useAuthStore();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [phoneNumber, setPhoneNumber] = useState<FormInput>({ val: "" });
    const [isUpdated, setIsUpdated] = useState<boolean>(false);

    useEffect(() => {
      if (!show) {
        setTimeout(() => {
          setPhoneNumber({ val: "" });
          setIsUpdated(false);
        }, 200);
      }
    }, [show]);

    const handlePhoneNumberChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitting) return;

        const { value: val } = e.target;

        setPhoneNumber({
          val,
          err: !val
            ? "Phone number is required"
            : !isValidVnPhoneNumber(val)
            ? "Phone number is invalid"
            : undefined,
        });
      },
      [isSubmitting]
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) {
          toast("Submission is in progress. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }

        const validatePhone = (): boolean => {
          if (!phoneNumber.val) {
            setPhoneNumber((prev) => ({
              ...prev,
              err: "Phone number is required",
            }));
            return false;
          }
          if (!isValidVnPhoneNumber(phoneNumber.val)) {
            setPhoneNumber((prev) => ({
              ...prev,
              err: "Phone number is invalid",
            }));
            return false;
          }
          return true;
        };

        if (validatePhone()) {
          const data: UserContactInfoUpdate = {
            type: "phoneNumber",
            value: phoneNumber.val,
          };

          setIsSubmitting(true);
          try {
            await updateSelfContactInfo(data);
            setIsUpdated(true);
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setIsSubmitting(false);
          }
        }
      },
      [isSubmitting, phoneNumber.val, updateSelfContactInfo]
    );

    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Phone Number</Modal.Title>
        </Modal.Header>

        {!isUpdated ? (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="form-floating">
                <input
                  type="phoneNumber"
                  className="form-control"
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="name@example.com"
                  value={phoneNumber.val}
                  onChange={handlePhoneNumberChange}
                  aria-describedBy="phoneNumberHelp"
                />
                <label htmlFor="phoneNumber">New Phone Number</label>
                {phoneNumber.err && (
                  <div className="text-danger small mt-1">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="me-2"
                    />
                    {phoneNumber.err}
                  </div>
                )}
                <div id="phoneNumberHelp" className="form-text mt-1">
                  We will send a verification code to this phone number at next
                  step.
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                onClick={onHide}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Btn
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Update Phone Number
              </Btn>
            </Modal.Footer>
          </form>
        ) : (
          <VerifyForm type="phoneNumber" onSuccess={onHide} />
        )}
      </Modal>
    );
  }
);

export default UpdateSelfPhoneModal;
