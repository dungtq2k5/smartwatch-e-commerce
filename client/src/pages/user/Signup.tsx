import { Link, useNavigate } from "react-router-dom";
import {
  PASSWORD_HINT_MESSAGE,
  USER_GENDER_OPTIONS,
} from "../../../../common/configs.common";
import type { FormInput } from "../../utils/types";
import { useCallback, useRef, useState } from "react";
import {
  formatError,
  isValidBirthDate,
  isValidEmail,
  isValidPassword,
  isValidUserFullName,
  isValidVnPhoneNumber,
} from "../../../../common/utils.common";
import { useAuthStore } from "../../store/user/authStore";
import type { UserSignup } from "../../../../common/types.common";
import toast from "react-hot-toast";
import AuthByGoogleBtn from "../../components/user/AuthByGoogleBtn";
import HorizontalDivider from "../../components/user/HorizontalDivider";
import { WAITING_EMOJI } from "../../configs";
import InvalidInputMsg from "../../components/common/InvalidInputMsg";

type FormData = {
  fullName: FormInput;
  emailOrPhone: FormInput;
  password: FormInput;
  confirmPassword: FormInput;
  birth: FormInput;
  gender: (typeof USER_GENDER_OPTIONS)[number];
};

export default function Signup() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Signup render count:", renderCount.current);

  const navigate = useNavigate();
  const { signup } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    fullName: { val: "" },
    emailOrPhone: { val: "" },
    password: { val: "" },
    confirmPassword: { val: "" },
    birth: { val: "" },
    gender: "other",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      if (isSubmitting) return;

      const { name, value: val } = e.target;

      if (name === "gender") {
        // select input
        setFormData((prev) => ({
          ...prev,
          gender: val as (typeof USER_GENDER_OPTIONS)[number],
        }));
        return;
      }

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
      } else if (name === "birth" && !isValidBirthDate(val)) {
        err = "Birth date is invalid";
      }

      setFormData((prev) => ({
        ...prev,
        [name]: { val, err },
      }));
    },
    [formData.confirmPassword.val, formData.password.val, isSubmitting]
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
        if (!newFormData.birth.val) {
          newFormData.birth.err = "Birth date is required";
          allValid = false;
        } else if (!isValidBirthDate(newFormData.birth.val)) {
          newFormData.birth.err = "Birth date is invalid";
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
          birth: formData.birth.val,
          gender: formData.gender,
        } as unknown as UserSignup;

        setIsSubmitting(true);
        try {
          await signup(user);
          navigate("/verify", { replace: true });
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [formData, isSubmitting, navigate, signup]
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
            <InvalidInputMsg msg={formData.fullName.err} />
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
            <InvalidInputMsg msg={formData.emailOrPhone.err} />
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
            <InvalidInputMsg msg={formData.password.err} />
          )}
          <div id="passwordHelp" className="form-text mt-1">
            {PASSWORD_HINT_MESSAGE}
          </div>
        </div>
        {/* Password Confirm */}
        <div className="form-floating mb-3">
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
            <InvalidInputMsg msg={formData.confirmPassword.err} />
          )}
          <div id="confirmPasswordHelp" className="form-text mt-1">
            Confirm password must match the password above.
          </div>
        </div>
        {/* Birth */}
        <div className="form-floating mb-3">
          <input
            type="date"
            className="form-control"
            id="birth"
            name="birth"
            value={formData.birth.val}
            onChange={handleChange}
          />
          <label htmlFor="birth">Birth date</label>
          {formData.birth.err && <InvalidInputMsg msg={formData.birth.err} />}
        </div>
        {/* Gender */}
        <div className="form-floating mb-4">
          <select
            className="form-select"
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
          >
            {USER_GENDER_OPTIONS.map((option) => (
              <option key={option} value={option} className="text-capitalize">
                {option}
              </option>
            ))}
          </select>
          <label htmlFor="gender">Gender</label>
        </div>

        <div className="d-flex gap-2 flex-column mb-4">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
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
