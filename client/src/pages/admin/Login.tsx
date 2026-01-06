import { useCallback, useRef, useState } from "react";
import useAuthStore from "../../store/admin/authStore";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../configs";
import {
  formatError,
  isValidEmail,
  isValidPassword,
} from "../../../../common/utils.common";
import { useNavigate } from "react-router-dom";
import Btn from "../../components/common/Btn";

export default function Login() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Login render count:", renderCount.current);

  const navigate = useNavigate();

  const { login } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (isSubmitting) {
        toast("Login is in progress. Please wait.", { icon: WAITING_EMOJI });
        return;
      }

      const formData = new FormData(e.currentTarget);
      const email = formData.get("email");
      const password = formData.get("password");
      try {
        // Validate inputs
        if (
          !email ||
          !password ||
          !isValidEmail(email) ||
          !isValidPassword(password)
        )
          throw new Error("Invalid credentials");

        setIsSubmitting(true);
        await login({ email: email as string, password: password as string });
        navigate("/admin", { replace: true });
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, login, navigate]
  );

  return (
    <main className="container--center--g">
      <form
        className="border rounded-3 shadow-sm p-4"
        autoComplete="on"
        style={{ minWidth: "400px" }}
        onSubmit={handleSubmit}
      >
        <h1 className="h3 mb-4 fw-normal">Admin Log in</h1>

        {/* Email input */}
        <div className="form-floating mb-3">
          <input
            type="email"
            className="form-control"
            id="email"
            name="email"
            autoComplete="email"
          />
          <label htmlFor="email">Email</label>
        </div>

        {/* Password input */}
        <div className="form-floating mb-4">
          <input
            type="password"
            className="form-control"
            id="password"
            name="password"
            autoComplete="current-password"
          />
          <label htmlFor="password">Password</label>
        </div>

        <Btn
          type="submit"
          className="w-100 btn btn-primary"
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Log in as Admin
        </Btn>
      </form>
    </main>
  );
}
