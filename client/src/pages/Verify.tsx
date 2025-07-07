import { useCallback, useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { VERIFICATION_CODE_LENGTH } from "../../../common/configs.common";
import type { UserVerify } from "../../../common/types.common";
import toast from "react-hot-toast";
import { TriangleAlert } from "lucide-react";

export default function Verify() {
  // DEV for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Verify render count:", renderCount.current);

  const {
    verify,
    verifyStart,
    verifySuccess,
    verifyFailure,
    stopLoading,
    clearError,
    user,
    isLoading,
    err,
  } = useAuthStore();

  const verifyType = user!.email ? "email" : "phone number";

  const [code, setCode] = useState<string[]>(
    Array(VERIFICATION_CODE_LENGTH).fill("")
  );

  const [inputErr, setInputErr] = useState<string>("");
  const navigate = useNavigate();

  const inputRefs = useRef<HTMLInputElement[]>([]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, idx: number): void => {
      const newCode = [...code];
      const val = e.target.value;

      // User past code -> loop and assign each from start -> focus at next if has
      if (val.length > 1) {
        const pastedCode = val.slice(0, VERIFICATION_CODE_LENGTH).split("");
        for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) {
          newCode[i] = pastedCode[i] || "";
        }

        if (val.length < VERIFICATION_CODE_LENGTH) {
          inputRefs.current[val.length].focus();
        }
      } else {
        // User input -> assign current -> focus next if has
        newCode[idx] = val;
        if (val && idx < VERIFICATION_CODE_LENGTH - 1) {
          inputRefs.current[idx + 1].focus();
        }
      }

      setCode(newCode);
    },
    [code]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
      if (e.key === "Backspace" && idx > 0 && !code[idx]) {
        // If user press Backspace and current input is empty, focus previous input
        inputRefs.current[idx - 1].focus();
      }
    },
    [code]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement> | Event): Promise<void> => {
      e.preventDefault();
      verifyStart();

      const validateForm = (): boolean => {
        return code.every((digit) => /^\d$/.test(digit));
      };

      if (validateForm()) {
        const data: UserVerify = {
          type: user!.email ? "email" : "phoneNumber",
          code: code.join(""),
        };

        try {
          const res = await verify(data);
          if (!res.success) {
            verifyFailure(res.message);
            return;
          }

          verifySuccess();
          navigate("/");
        } catch (error) {
          verifyFailure(error);
        }
        return;
      }

      setInputErr("Please fill all digits with numbers");
      stopLoading();
    },
    [
      code,
      navigate,
      stopLoading,
      user,
      verify,
      verifyFailure,
      verifyStart,
      verifySuccess,
    ]
  );

  // Auto submit when all digits are filled
  useEffect((): void => {
    if (code.every((digit) => digit !== "")) {
      handleSubmit(new Event("submit"));
    }
  }, [code, handleSubmit]);

  useEffect((): void => {
    if (err) {
      toast.error(err);
      clearError();
    }
  }, [err, clearError]);

  return (
    <main>
      <form className="border rounded-3 shadow-sm p-4">
        <div>
          <h1 className="h3 mb-4 fw-normal">Verify your {verifyType}</h1>
          <p>Enter the verification code we sent to your {verifyType}</p>
        </div>

        <div className="d-flex justify-content-center gap-2 mb-1">
          {code.map((digit, idx) => {
            const inputName = `digit-input-${idx}`;

            return (
              <div key={inputName} style={{ width: "3rem" }}>
                <label htmlFor={inputName} hidden aria-hidden="true">
                  Input code at index {idx}
                </label>
                <input
                  type="text"
                  id={inputName}
                  name={inputName}
                  value={digit}
                  maxLength={VERIFICATION_CODE_LENGTH}
                  className="form-control text-center"
                  style={{ fontSize: "1.5rem", height: "3rem" }}
                  ref={(e) => {
                    inputRefs.current[idx] = e as HTMLInputElement;
                  }}
                  onChange={(e) => handleChange(e, idx)}
                  onKeyDown={(e) => {
                    handleKeyDown(e, idx);
                  }}
                  aria-label={`Verification code digit at index ${idx + 1}`}
                />
              </div>
            );
          })}
        </div>
        {inputErr && (
          <div className="text-danger small mb-3">
            <TriangleAlert size={16} /> {inputErr}
          </div>
        )}

        <button
          className="w-100 btn btn-primary"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              ></span>
              <output>Verifying...</output>
            </>
          ) : (
            `Verify my ${verifyType}`
          )}
        </button>
      </form>
    </main>
  );
}
