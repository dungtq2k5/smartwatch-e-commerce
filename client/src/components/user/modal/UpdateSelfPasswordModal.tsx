import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import toast from "react-hot-toast";
import { formatError, isValidPassword } from "../../../../../common/utils.common";
import useAuthStore from "../../../store/user/authStore";
import { PASSWORD_HINT_MESSAGE } from "../../../../../common/configs.common";
import type { FormInput } from "../../../utils/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { WAITING_EMOJI } from "../../../configs";
import Btn from "../../common/Btn";

type FormData = {
  currentPassword: FormInput;
  newPassword: FormInput;
  confirmNewPassword: FormInput;
};

const UpdateSelfPasswordModal = memo(
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
    console.log("UpdateSelfPasswordModal render count:", renderCount.current);

    const { user, updateSelfPassword } = useAuthStore();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
      currentPassword: { val: "" },
      newPassword: { val: "" },
      confirmNewPassword: { val: "" },
    });

    useEffect(() => {
      if (!show) {
        setTimeout(() => {
          setFormData({
            currentPassword: { val: "" },
            newPassword: { val: "" },
            confirmNewPassword: { val: "" },
          });
        }, 200);
      }
    }, [show]);

    const handleChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitting) return;

        const { name, value: val } = e.target;

        let err = "";
        if (!val) {
          err = `${name} is required`;
        } else if (name === "newPassword") {
          if (!isValidPassword(val)) err = "New password is invalid";
          if (val === formData.confirmNewPassword.val) {
            setFormData((prev) => ({
              ...prev,
              confirmNewPassword: { ...prev.confirmNewPassword, err: "" },
            }));
          }
        } else if (
          name === "confirmNewPassword" &&
          val !== formData.newPassword.val
        ) {
          err = "Confirm password must match the new password";
        }

        setFormData((prev) => ({
          ...prev,
          [name]: { val, err },
        }));
      },
      [formData.confirmNewPassword.val, formData.newPassword.val, isSubmitting]
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
          let allValid = true;
          const newFormData: FormData = { ...formData };

          if (!newFormData.currentPassword.val) {
            newFormData.currentPassword.err = "Current password is required";
            allValid = false;
          }
          if (!newFormData.newPassword.val) {
            newFormData.newPassword.err = "New password is required";
            allValid = false;
          } else if (!isValidPassword(newFormData.newPassword.val)) {
            newFormData.newPassword.err = "New password is invalid";
            allValid = false;
          }
          if (!newFormData.confirmNewPassword.val) {
            newFormData.confirmNewPassword.err = "Confirm password is required";
            allValid = false;
          } else if (
            newFormData.confirmNewPassword.val !== newFormData.newPassword.val
          ) {
            newFormData.confirmNewPassword.err =
              "Confirm password must match the new password";
            allValid = false;
          }

          setFormData(newFormData);
          return allValid;
        };

        if (validateForm()) {
          const data = {
            currentPassword: formData.currentPassword.val,
            newPassword: formData.newPassword.val,
          };

          setIsSubmitting(true);
          try {
            await updateSelfPassword(data);
            onHide();
            toast.success("Password updated successfully");
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setIsSubmitting(false);
          }
        }
      },
      [formData, isSubmitting, onHide, updateSelfPassword]
    );

    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Update Password</Modal.Title>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <p className="mb-2">
              Enter your current password to validate it is you.
            </p>

            {/* Hidden username field fir accessibility and password managers */}
            <input
              type="text"
              id="fullName"
              name="fullName"
              autoComplete="username"
              value={user?.fullName ?? ""}
              hidden
              readOnly
            />

            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="currentPassword"
                name="currentPassword"
                placeholder="myCurrentPassword@123"
                value={formData.currentPassword.val}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <label htmlFor="currentPassword">Current Password</label>
              {formData.currentPassword.err && (
                <div className="text-danger small mt-1">
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="me-2"
                  />
                  {formData.currentPassword.err}
                </div>
              )}
            </div>

            <p className="mb-2">Enter your new strong password.</p>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="newPassword"
                name="newPassword"
                placeholder="yourVeryStrongNewPassword1234"
                value={formData.newPassword.val}
                onChange={handleChange}
                aria-describedby="newPasswordHelp"
                autoComplete="new-password"
              />
              <label htmlFor="newPassword">New Password</label>
              {formData.newPassword.err && (
                <div className="text-danger small mt-1">
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="me-2"
                  />
                  {formData.newPassword.err}
                </div>
              )}
              <div id="newPasswordHelp" className="form-text mt-1">
                {PASSWORD_HINT_MESSAGE}
              </div>
            </div>

            <div className="form-floating">
              <input
                type="password"
                className="form-control"
                id="confirmNewPassword"
                name="confirmNewPassword"
                placeholder="yourVeryStrongNewPassword1234"
                value={formData.confirmNewPassword.val}
                onChange={handleChange}
                aria-describedby="confirmNewPasswordHelp"
                autoComplete="new-password"
              />
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              {formData.confirmNewPassword.err && (
                <div className="text-danger small mt-1">
                  <FontAwesomeIcon
                    icon={faTriangleExclamation}
                    className="me-2"
                  />
                  {formData.confirmNewPassword.err}
                </div>
              )}
              <div id="confirmNewPasswordHelp" className="form-text mt-1">
                Confirm password must match the new password above.
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
              Close
            </Button>
            <Btn
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Update Password
            </Btn>
          </Modal.Footer>
        </form>
      </Modal>
    );
  }
);

export default UpdateSelfPasswordModal;
