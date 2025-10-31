import { Link } from "react-router-dom";
import type { FormInput } from "../../utils/types";
import { useAuthStore } from "../../store/user/authStore";
import { useCallback, useState } from "react";
import {
  formatError,
  isValidEmail,
  isValidVnPhoneNumber,
} from "../../../../common/utils.common";
import type { UserForgotPassword } from "../../../../common/types.common";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../configs";

export default function ForgotPassword() {
  const { forgotPassword } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [emailOrPhone, setEmailOrPhone] = useState<FormInput>({
    val: "",
  });
  const [isSent, setIsSent] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (isSubmitting) return;

      const { value: val } = e.target;

      let err = "";
      if (!val) {
        err = "This field is required";
      } else if (!isValidEmail(val) && !isValidVnPhoneNumber(val)) {
        err = "Please enter a valid email or phone number";
      }

      setEmailOrPhone({ val, err });
    },
    [isSubmitting]
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
        const val = emailOrPhone.val;

        if (!val) {
          setEmailOrPhone({ val, err: "This field is required" });
          return false;
        }
        if (!isValidEmail(val) && !isValidVnPhoneNumber(val)) {
          setEmailOrPhone({
            val,
            err: "Please enter a valid email or phone number",
          });
          return false;
        }
        return true;
      };

      if (validateForm()) {
        const data: UserForgotPassword = {
          [emailOrPhone.val.includes("@") ? "email" : "phoneNumber"]:
            emailOrPhone.val,
        } as unknown as UserForgotPassword;

        setIsSubmitting(true);
        try {
          await forgotPassword(data);
          setIsSent(true);
        } catch (error) {
          toast.error(formatError(error));
          return;
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [emailOrPhone.val, forgotPassword, isSubmitting]
  );

  return (
    <main className="container--center--g">
      {isSent ? (
        <div className="border rounded-3 shadow-sm p-4 text-center">
          <h1 className="h3 mb-3 fw-normal">
            Check your email or phone number
          </h1>
          <p className="mb-1">
            We have sent you a link to reset your password. Please check your
            email or SMS for the link, link could take a few minutes to arrive
            so please wait.
          </p>
          <p className="text-muted small">
            If you do not receive the link, please check your spam folder or
            request a new link.
          </p>
        </div>
      ) : (
        <form
          className="border rounded-3 shadow-sm p-4"
          onSubmit={handleSubmit}
        >
          <h1 className="h3 mb-3 fw-normal">Forgot Password</h1>

          <div className="form-floating">
            <input
              type="text"
              className="form-control"
              id="emailOrPhone"
              name="emailOrPhone"
              placeholder="name@example.com or 0123456789"
              value={emailOrPhone.val}
              onChange={handleChange}
            />
            <label htmlFor="emailOrPhone">Email or phone number</label>
            {emailOrPhone.err && (
              <div className="text-danger small mt-1">
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="me-2"
                />
                {emailOrPhone.err}
              </div>
            )}
          </div>

          <button
            className="w-100 btn btn-lg btn-primary mt-3"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Sending link...</output>
              </>
            ) : (
              "Send reset link"
            )}
          </button>

          <p className="mt-4 mb-0 text-muted">
            Remembered your password? <Link to="/login">Log in now</Link>
          </p>
        </form>
      )}
    </main>
  );
}
