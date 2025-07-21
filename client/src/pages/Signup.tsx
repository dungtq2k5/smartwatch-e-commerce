import { Link, useNavigate } from "react-router-dom";
import { PASSWORD_HINT_MESSAGE } from "../../../common/configs.common";
import type { FormInput } from "../utils/types";
import { useCallback, useRef, useState } from "react";
import {
  isValidEmail,
  isValidPassword,
  isValidUserFullName,
  isValidVnPhoneNumber,
} from "../../../common/utils.common";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthStore } from "../store/authStore";
import type { UserSignup } from "../../../common/types.common";
import toast from "react-hot-toast";
import { formatError } from "../utils/utils";
import AuthByGoogleBtn from "../components/AuthByGoogleBtn";
import HorizontalDivider from "../components/HorizontalDivider";

type FormData = {
  fullName: FormInput;
  emailOrPhone: FormInput;
  password: FormInput;
  confirmPassword: FormInput;
};

export default function Signup() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Signup render count:", renderCount.current);

  const [formData, setFormData] = useState<FormData>({
    fullName: { val: "" },
    emailOrPhone: { val: "" },
    password: { val: "" },
    confirmPassword: { val: "" },
  });
  const { signup, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const { name, value: val } = e.target;

      let err = "";
      if (!val) {
        err = `${name} is required`;
      } else if (name === "fullName" && !isValidUserFullName(val)) {
        err = "Full name is invalid";
      } else if (
        name === "emailOrPhone" &&
        !isValidEmail(val) &&
        !isValidVnPhoneNumber(val)
      ) {
        err = "Email or phone number is invalid";
      } else if (name === "password") {
        if (!isValidPassword(val)) err = "Password is invalid";
        if (val === formData.confirmPassword.val) {
          setFormData((prev) => ({
            ...prev,
            confirmPassword: { ...prev.confirmPassword, err: "" },
          }));
        }
      } else if (name === "confirmPassword" && val !== formData.password.val) {
        err = "Confirm password must match the password above";
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

        if (!newFormData.fullName.val) {
          newFormData.fullName.err = "Full name is required";
          allValid = false;
        } else if (!isValidUserFullName(newFormData.fullName.val)) {
          newFormData.fullName.err = "Full name is invalid";
          allValid = false;
        }
        if (!newFormData.emailOrPhone.val) {
          newFormData.emailOrPhone.err = "Email or phone number is required";
          allValid = false;
        } else if (
          !isValidEmail(newFormData.emailOrPhone.val) &&
          !isValidVnPhoneNumber(newFormData.emailOrPhone.val)
        ) {
          newFormData.emailOrPhone.err = "Email or phone number is invalid";
          allValid = false;
        }
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
            "Confirm password must match the password above";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      if (validateForm()) {
        const emailOrPhone = isValidEmail(formData.emailOrPhone.val)
          ? "email"
          : "phoneNumber";
        const user: UserSignup = {
          fullName: formData.fullName.val,
          [emailOrPhone]: formData.emailOrPhone.val,
          password: formData.password.val,
        } as unknown as UserSignup;

        try {
          await signup(user);
          navigate("/verify");
        } catch (error) {
          toast.error(formatError(error));
        }
      }
    },
    [formData, navigate, signup]
  );

  return (
    <main className="container--center--g">
      <form className="border rounded-3 shadow-sm p-4" onSubmit={handleSubmit}>
        <h1 className="h3 mb-4 fw-normal">Sign up</h1>
        {/* Full name */}
        <div className="form-floating mb-3">
          <input
            type="text"
            className="form-control"
            id="fullName"
            name="fullName"
            placeholder="John Doe"
            value={formData.fullName.val}
            onChange={handleChange}
            autoComplete="name"
          />
          <label htmlFor="fullName">Full name</label>
          {formData.fullName.err && (
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
              {formData.fullName.err}
            </div>
          )}
        </div>
        {/* Email or Phone */}
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
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
              {formData.emailOrPhone.err}
            </div>
          )}
        </div>
        {/* Password */}
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
          <label htmlFor="password">Password</label>
          {formData.password.err && (
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
              {formData.password.err}
            </div>
          )}
          <div id="passwordHelp" className="form-text mt-1">
            {PASSWORD_HINT_MESSAGE}
          </div>
        </div>
        {/* Password Confirm */}
        <div className="form-floating mb-4">
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
          <label htmlFor="confirmPassword">Confirm password</label>
          {formData.confirmPassword.err && (
            <div className="text-danger small mt-1">
              <FontAwesomeIcon icon={faTriangleExclamation} />{" "}
              {formData.confirmPassword.err}
            </div>
          )}
          <div id="confirmPasswordHelp" className="form-text mt-1">
            Confirm password must match the password above.
          </div>
        </div>

        <div className="d-flex gap-2 flex-column mb-4">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Signing up...</output>
              </>
            ) : (
              "Sign me up"
            )}
          </button>
          <HorizontalDivider text="or" />
          <AuthByGoogleBtn />
        </div>

        <p className="mb-0 text-muted">
          Already have an account? <Link to="/login">Login now</Link>
        </p>
      </form>
    </main>
  );
}
