import { useRef } from "react";
import { useAuthStore } from "../store/authStore";
import VerifyForm from "../components/VerifyForm";
import ApiError from "../components/ApiError";
import { useNavigate } from "react-router-dom";

export default function Verify() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Verify render count:", renderCount.current);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <main className="container--g container--center--g">
      {!user ? (
        <ApiError errMsg="User data is not available." />
      ) : (
        <VerifyForm
          type={user.email ? "email" : "phoneNumber"}
          onSuccess={() => {
            navigate("/", { replace: true });
          }}
        />
      )}
    </main>
  );
}
