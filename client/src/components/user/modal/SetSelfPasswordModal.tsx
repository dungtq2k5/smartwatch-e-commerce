import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import toast from "react-hot-toast";
import {
  formatError,
  isValidPassword,
} from "../../../../../common/utils.common";
import useAuthStore from "../../../store/user/authStore";
import { PASSWORD_HINT_MESSAGE } from "../../../../../common/configs.common";
import type { FormInput } from "../../../utils/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { MODAL_CLOSE_DELAY_MS, WAITING_EMOJI } from "../../../configs";
import Btn from "../../common/Btn";

type FormData = {
  password: FormInput;
  confirmPassword: FormInput;
};

const SetSelfPasswordModal = memo(
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
    console.log("SetSelfPasswordModal render count:", renderCount.current);

    const { user, setSelfPassword } = useAuthStore();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const [formData, setFormData] = useState<FormData>({
      password: { val: "" },
      confirmPassword: { val: "" },
    });

    useEffect(() => {
      if (!show) {
        setTimeout(() => {
          setFormData({
            password: { val: "" },
            confirmPassword: { val: "" },
          });
        }, MODAL_CLOSE_DELAY_MS);
      }
    }, [show]);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitting) return;
        const { name, value: val } = e.target;

        let err = "";
        if (!val) {
          err = `${name} is required`;
        } else if (name === "password" && !isValidPassword(val)) {
          err = "Password is invalid";
        } else if (
          name === "confirmPassword" &&
          val !== formData.password.val
        ) {
          err = "Confirm password must match the password above";
        }

        setFormData((prev) => ({
          ...prev,
          [name]: { val, err },
        }));
      },
      [formData.password.val, isSubmitting]
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (isSubmitting) {
          toast("Submission is in progress. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }

        const validateForm = (): boolean => {
          let isValid = true;
          const newFormData: FormData = { ...formData };

          if (!newFormData.password.val) {
            newFormData.password.err = "Password is required";
            isValid = false;
          } else if (!isValidPassword(newFormData.password.val)) {
            newFormData.password.err = "Password is invalid";
            isValid = false;
          }
          if (!newFormData.confirmPassword.val) {
            newFormData.confirmPassword.err = "Confirm password is required";
            isValid = false;
          } else if (
            newFormData.confirmPassword.val !== newFormData.password.val
          ) {
            newFormData.confirmPassword.err = "Confirm password must match";
            isValid = false;
          }

          setFormData(newFormData);
          return isValid;
        };

        if (validateForm()) {
          const data = {
            password: formData.password.val,
          };

          setIsSubmitting(true);
          try {
            await setSelfPassword(data);
            onHide();
            toast.success("Password set successfully");
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setIsSubmitting(false);
          }
        }
      },
      [formData, isSubmitting, onHide, setSelfPassword]
    );

    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Set Password</Modal.Title>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Hidden username field fir accessibility and password managers */}
            <input
              type="text"
              id="fullName2"
              name="fullName2"
              autoComplete="username"
              value={user?.fullName ?? ""}
              hidden
              readOnly
            />

            <p>Enter your new strong password.</p>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                placeholder="yourVeryStrongPassword1234"
                value={formData.password.val}
                onChange={handleChange}
                aria-describedby="passwordHelp"
                autoComplete="new-password"
              />
              <label htmlFor="password">New Password</label>
              {formData.password.err && (
                <div className="text-danger small mt-1">
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="me-2"
                  />
                  {formData.password.err}
                </div>
              )}
              <div id="passwordHelp" className="form-text mt-1">
                {PASSWORD_HINT_MESSAGE}
              </div>
            </div>

            <div className="form-floating">
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                name="confirmPassword"
                placeholder="yourVeryStrongNewPassword1234"
                value={formData.confirmPassword.val}
                onChange={handleChange}
                aria-describedby="confirmPasswordHelp"
                autoComplete="new-password"
              />
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div id="confirmPasswordHelp" className="form-text">
                Confirm password must match the new password above.
              </div>
              {formData.confirmPassword.err && (
                <div className="text-danger small mt-1">
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="me-2"
                  />
                  {formData.confirmPassword.err}
                </div>
              )}
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="button"
              variant="secondary"
              onClick={onHide}
              disabled={isSubmitting}
            >
              Close
            </Button>
            <Btn
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Set Password
            </Btn>
          </Modal.Footer>
        </form>
      </Modal>
    );
  }
);

export default SetSelfPasswordModal;
