import { Link, useNavigate } from "react-router-dom";
import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../../store/user/authStore";
import type { UserLogin } from "../../../../common/types.common";
import toast from "react-hot-toast";
import type { FormInput } from "../../utils/types";
import {
  formatError,
  isValidEmail,
  isValidPassword,
  isValidVnPhoneNumber,
} from "../../../../common/utils.common";
import AuthByGoogleBtn from "../../components/user/AuthByGoogleBtn";
import HorizontalDivider from "../../components/user/HorizontalDivider";
import { WAITING_EMOJI } from "../../configs";
import InvalidInputMsg from "../../components/common/InvalidInputMsg";

type FormData = {
  emailOrPhone: FormInput;
  password: FormInput;
};

export default function Login() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Login render count:", renderCount.current);

  const navigate = useNavigate();

  const { login, user } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    emailOrPhone: { val: "" },
    password: { val: "" },
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (isSubmitting) return;

      const { name, value: val } = e.target;

      let err = "";
      if (!val) {
        if (name === "emailOrPhone") {
          err = "Email or phone number is required";
        } else if (name === "password") {
          err = "Password is required";
        }
      }

      setFormData((prev) => ({
        ...prev,
        [name]: {
          val,
          err,
        },
      }));
    },
    [isSubmitting]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (isSubmitting) {
        toast("Login is in progress. Please wait.", { icon: WAITING_EMOJI });
        return;
      }

      const validateForm = (): boolean => {
        let isAllValid = true;
        const newFormData: FormData = { ...formData };

        if (!newFormData.emailOrPhone.val) {
          newFormData.emailOrPhone.err = "Email or phone number is required";
          isAllValid = false;
        }
        if (!newFormData.password.val) {
          newFormData.password.err = "Password is required";
          isAllValid = false;
        }

        return isAllValid;
      };

      if (validateForm()) {
        // Fake request response when value is invalid
        if (
          (!isValidEmail(formData.emailOrPhone.val) &&
            !isValidVnPhoneNumber(formData.emailOrPhone.val)) ||
          !isValidPassword(formData.password.val)
        ) {
          toast.error("Invalid credentials.");
          return;
        }

        const data: UserLogin = {
          [formData.emailOrPhone.val.includes("@") ? "email" : "phoneNumber"]:
            formData.emailOrPhone.val,
          password: formData.password.val,
        } as unknown as UserLogin;

        setIsSubmitting(true);
        try {
          await login(data);
          navigate("/", { replace: true });
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [formData, isSubmitting, login, navigate]
  );

  return (
    <main className="container--center--g">
      <form
        className="border rounded-3 shadow-sm p-4"
        autoComplete="on"
        onSubmit={handleSubmit}
      >
        <h1 className="h3 mb-4 fw-normal">Log in</h1>
        {/* Email or phone number */}
        <div className="form-floating mb-3">
          <input
            type="text"
            className="form-control"
            id="emailOrPhone"
            name="emailOrPhone"
            placeholder="name@example.com or 0123456789"
            value={formData.emailOrPhone.val}
            onChange={handleChange}
            autoComplete="email"
          />
          <label htmlFor="emailOrPhone">Email or phone number</label>
          {formData.emailOrPhone.err && (
            <InvalidInputMsg msg={formData.emailOrPhone.err} />
          )}
        </div>
        {/* Password */}
        <div className="form-floating mb-4">
          <input
            type="password"
            className="form-control"
            id="password"
            name="password"
            placeholder="aVeryStrongPassword12345"
            value={formData.password.val}
            onChange={handleChange}
            autoComplete="current-password"
          />
          <label htmlFor="password">Password</label>
          {formData.password.err && (
            <InvalidInputMsg msg={formData.password.err} />
          )}
        </div>

        <div className="d-flex gap-2 flex-column mb-4">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Logging in...</output>
              </>
            ) : (
              "Log me in"
            )}
          </button>
          <HorizontalDivider text="or" />
          <AuthByGoogleBtn />
        </div>

        <p className="mb-1 text-muted">
          Don't have an account? <Link to="/signup">Sign up now</Link>
        </p>
        <p className="mb-1 text-muted">
          Forgot your password? <Link to="/forgot-password">Reset it now</Link>
        </p>
        {user && (
          <p className="mb-0 text-muted">
            Not verified yet? <Link to="/verify">Verify your account</Link>
          </p>
        )}
      </form>
    </main>
  );
}
