import { memo, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import toast from "react-hot-toast";
import { formatError } from "../utils/utils";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../utils/firebase.config";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

const AuthByGoogleBtn = memo(() => {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("AuthByGoogleBtn rendered", renderCount.current);

  const { isLoading, authByGoogle } = useAuthStore();
  const navigate = useNavigate();

  const handleGoogleAuth = async (): Promise<void> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential) {
        throw new Error("Google authentication failed: No credential found.");
      }

      const accessToken = credential.accessToken;
      const idToken = await result.user.getIdToken();
      if (!accessToken || !idToken) {
        throw new Error(
          "Google authentication failed: No access token or ID token."
        );
      }

      await authByGoogle({ idToken, accessToken });
      navigate("/");
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  return (
    <button
      type="button"
      className="btn btn-danger"
      onClick={handleGoogleAuth}
      disabled={isLoading}
    >
      <FontAwesomeIcon icon={faGoogle} className="me-2" />
      {isLoading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          <output>Authenticating...</output>
        </>
      ) : (
        "Auth by Google"
      )}
    </button>
  );
});

export default AuthByGoogleBtn;
