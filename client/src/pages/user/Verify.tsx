import { useRef } from "react";
import useAuthStore from "../../store/user/authStore";
import VerifyForm from "../../components/user/VerifyForm";
import ApiError from "../../components/common/ApiError";
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
        <ApiError errorMessage="User data is not available." />
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
