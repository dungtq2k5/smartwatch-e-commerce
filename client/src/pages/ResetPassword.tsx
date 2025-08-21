import { useCallback, useRef, useState } from "react";
import { PASSWORD_HINT_MESSAGE } from "../../../common/configs.common";
import type { FormInput } from "../utils/types";
import { useNavigate, useParams } from "react-router-dom";
import { isValidPassword } from "../../../common/utils.common";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { formatError } from "../utils/utils";

type FormData = {
  password: FormInput;
  confirmPassword: FormInput;
};

export default function ResetPassword() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("ResetPassword render count:", renderCount.current);

  const { token } = useParams();
  const { resetPassword, isLoading } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    password: { val: "" },
    confirmPassword: { val: "" },
  });

  const navigate = useNavigate();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const { name, value: val } = e.target;

      let err = "";
      if (!val) {
        err = `${name} is required`;
      } else if (name === "password" && !isValidPassword(val)) {
        err = "Password is invalid";
      } else if (name === "confirmPassword" && val !== formData.password.val) {
        err = "Confirm password doesn't match the password above";
      }

      setFormData((prev) => ({
        ...prev,
        [name]: {
          val,
          err,
        },
      }));
    },
    [formData.password.val]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      const validateForm = (): boolean => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (!newFormData.password.val) {
          newFormData.password.err = "Password is required";
          allValid = false;
        } else if (!isValidPassword(newFormData.password.val)) {
          newFormData.password.err = "Password is invalid";
          allValid = false;
        }
        if (!newFormData.confirmPassword.val) {
          newFormData.confirmPassword.err = "Confirm password is required";
          allValid = false;
        } else if (
          newFormData.confirmPassword.val !== newFormData.password.val
        ) {
          newFormData.confirmPassword.err =
            "Confirm password doesn't match the password above";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      if (validateForm()) {
        if (!token) {
          toast.error("Token is required for resetting password");
          return;
        }

        try {
          await resetPassword(formData.password.val, token);
          navigate("/login");
          toast.success("Password reset successfully. You can now log in.");
        } catch (error) {
          toast.error(formatError(error));
        }
      }
    },
    [formData, resetPassword, token, navigate]
  );

  return (
    <main className="container--center--g">
      <form className="border rounded-3 shadow-sm p-4" onSubmit={handleSubmit}>
        <h1 className="h3 mb-4 fw-normal">Reset Password</h1>

        <div className="form-floating mb-3">
          <input
            type="password"
            className="form-control"
            id="password"
            name="password"
            placeholder="yourVeryStrongNewPassword1234"
            value={formData.password.val}
            onChange={handleChange}
            aria-describedby="passwordHelp"
            autoComplete="new-password"
          />
          <label htmlFor="password">New Password</label>
          <div id="passwordHelp" className="form-text">
            {PASSWORD_HINT_MESSAGE}
          </div>
          {formData.password.err && (
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
              {formData.password.err}
            </div>
          )}
        </div>

        <div className="form-floating mb-3">
          <input
            type="password"
            className="form-control"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="yourVeryStrongNewPassword1234"
            value={formData.confirmPassword.val}
            onChange={handleChange}
            aria-describedby="passwordConfirmHelp"
            autoComplete="new-password"
          />
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div id="passwordConfirmHelp">
            Confirm password must match the password above.
          </div>
          {formData.confirmPassword.err && (
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
              {formData.confirmPassword.err}
            </div>
          )}
        </div>

        <button
          className="w-100 btn btn-primary mt-3 mb-3"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              ></span>
              <output>Resetting password...</output>
            </>
          ) : (
            "Reset my password"
          )}
        </button>

        <p className="mb-0 text-muted">
          Remembered your password? <a href="/login">Log in now</a>
        </p>
      </form>
    </main>
  );
}
