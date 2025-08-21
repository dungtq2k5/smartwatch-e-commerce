import { Link, useNavigate } from "react-router-dom";
import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../store/authStore";
import type { UserLogin } from "../../../common/types.common";
import toast from "react-hot-toast";
import type { FormInput } from "../utils/types";
import {
  isValidEmail,
  isValidPassword,
  isValidVnPhoneNumber,
} from "../../../common/utils.common";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatError } from "../utils/utils";
import AuthByGoogleBtn from "../components/AuthByGoogleBtn";
import HorizontalDivider from "../components/HorizontalDivider";

type FormData = {
  emailOrPhone: FormInput;
  password: FormInput;
};

export default function Login() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Login render count:", renderCount.current);

  const { login, user, isLoading } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    emailOrPhone: { val: "" },
    password: { val: "" },
  });

  const navigate = useNavigate();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
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
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

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

        try {
          await login(data);
          navigate("/");
        } catch (error) {
          toast.error(formatError(error));
        }
      }
    },
    [formData, login, navigate]
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
            autoComplete="username"
          />
          <label htmlFor="emailOrPhone">Email or phone number</label>
          {formData.emailOrPhone.err && (
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
              {formData.emailOrPhone.err}
            </div>
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
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
              {formData.password.err}
            </div>
          )}
        </div>

        <div className="d-flex gap-2 flex-column mb-4">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Signing in...</output>
              </>
            ) : (
              "Sign me in"
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
