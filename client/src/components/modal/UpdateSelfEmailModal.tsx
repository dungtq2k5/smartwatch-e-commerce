import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { Button, Modal } from "react-bootstrap";
import type { FormInput } from "../../utils/types";
import { isValidEmail } from "../../../../common/utils.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { UserUpdateContactInfo } from "../../../../common/types.common";
import { formatError } from "../../utils/utils";
import toast from "react-hot-toast";
import VerifyForm from "../VerifyForm";

const UpdateSelfEmailModal = memo(
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
    console.log("UpdateSelfEmailModal render count:", renderCount.current);

    const { isLoading, updateSelfContactInfo } = useAuthStore();
    const [email, setEmail] = useState<FormInput>({ val: "" });
    const [isUpdated, setIsUpdated] = useState<boolean>(false);

    useEffect(() => {
      if (!show) {
        setTimeout(() => {
          setEmail({ val: "" });
          setIsUpdated(false);
        }, 200);
      }
    }, [show]);

    const handleEmailChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value: val } = e.target;

        setEmail({
          val,
          err: !val
            ? "Email is required"
            : !isValidEmail(val)
            ? "Email is invalid"
            : undefined,
        });
      },
      []
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validateEmail = (): boolean => {
          if (!email.val) {
            setEmail((prev) => ({ ...prev, err: "Email is required" }));
            return false;
          }
          if (!isValidEmail(email.val)) {
            setEmail((prev) => ({ ...prev, err: "Email is invalid" }));
            return false;
          }

          return true;
        };

        if (validateEmail()) {
          const data: UserUpdateContactInfo = {
            type: "email",
            value: email.val,
          };

          try {
            await updateSelfContactInfo(data);
            setIsUpdated(true);
          } catch (error) {
            toast.error(formatError(error));
          }
        }
      },
      [email.val, updateSelfContactInfo]
    );

    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Email</Modal.Title>
        </Modal.Header>

        {!isUpdated ? (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="form-floating">
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  value={email.val}
                  onChange={handleEmailChange}
                  aria-describedBy="emailHelp"
                />
                <label htmlFor="email">New Email</label>
                {email.err && (
                  <div className="text-danger small mt-1">
                    <FontAwesomeIcon icon={faTriangleExclamation} /> {email.err}
                  </div>
                )}
                <div id="emailHelp" className="form-text mt-1">
                  We will send a verification email to this address at next step.
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                onClick={onHide}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    <output>Updating email...</output>
                  </>
                ) : (
                  "Update email"
                )}
              </Button>
            </Modal.Footer>
          </form>
        ) : (
          <VerifyForm type="email" onSuccess={onHide} />
        )}
      </Modal>
    );
  }
);

export default UpdateSelfEmailModal;
