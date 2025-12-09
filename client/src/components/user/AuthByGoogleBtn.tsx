import { memo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import toast from "react-hot-toast";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../utils/firebase.config";
import useAuthStore from "../../store/user/authStore";
import { useNavigate } from "react-router-dom";
import { formatError } from "../../../../common/utils.common";

const AuthByGoogleBtn = memo(() => {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("AuthByGoogleBtn rendered", renderCount.current);

  const navigate = useNavigate();

  const { authByGoogle } = useAuthStore();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleGoogleAuth = async (): Promise<void> => {
    if (isSubmitting) return;

    setIsSubmitting(true);
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
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-danger"
      onClick={handleGoogleAuth}
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            aria-hidden="true"
          ></span>
          <output>Authenticating...</output>
        </>
      ) : (
        <>
          <FontAwesomeIcon icon={faGoogle} className="me-2" />
          Authenticate with Google
        </>
      )}
    </button>
  );
});

export default AuthByGoogleBtn;
