import { useCallback, useState, useRef, useEffect, memo } from "react";
import useAuthStore from "../../store/user/authStore";
import { VERIFICATION_CODE_LENGTH } from "../../../../common/configs.common";
import type { VerifyType, UserVerify } from "../../../../common/types.common";
import toast from "react-hot-toast";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatError } from "../../../../common/utils.common";
import { WAITING_EMOJI } from "../../configs";
import Btn from "../common/Btn";

const VerifyForm = memo(
  ({
    type,
    onSuccess,
  }: Readonly<{
    type: VerifyType;
    onSuccess: () => void;
  }>) => {
    // DEV for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("VerifyForm render count:", renderCount.current);

    const { verify } = useAuthStore();

    const verifyTypeName = type === "email" ? "email" : "phone number";

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const [code, setCode] = useState<string[]>(
      new Array(VERIFICATION_CODE_LENGTH).fill("")
    );

    const [inputErr, setInputErr] = useState<string>("");

    const inputRefs = useRef<HTMLInputElement[]>([]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>, idx: number): void => {
        if (isSubmitting) return;

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
      [code, isSubmitting]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
        if (isSubmitting) return;

        if (e.key === "Backspace" && idx > 0 && !code[idx]) {
          // If user press Backspace and current input is empty, focus previous input
          inputRefs.current[idx - 1].focus();
        }
      },
      [code, isSubmitting]
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement> | Event): Promise<void> => {
        e.preventDefault();
        if (isSubmitting) {
          toast("Verification in progress. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }

        const validateForm = (): boolean => {
          return code.every((digit) => /^\d$/.test(digit));
        };

        if (validateForm()) {
          const data: UserVerify = {
            type,
            code: code.join(""),
          };

          setIsSubmitting(true);
          try {
            await verify(data);
            toast.success(
              `Your ${verifyTypeName} has been verified successfully!`
            );
            onSuccess();
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setIsSubmitting(false);
          }
        }

        setInputErr("Please fill all digits with numbers");
      },
      [code, isSubmitting, onSuccess, type, verify, verifyTypeName]
    );

    // Auto submit when all digits are filled
    useEffect((): void => {
      if (code.every((digit) => digit !== "")) {
        handleSubmit(new Event("submit"));
      }
    }, [code, handleSubmit]);

    return (
      <form className="border rounded-3 shadow-sm p-4" onSubmit={handleSubmit}>
        <h1 className="h3 mb-4 fw-normal">Verify your {verifyTypeName}</h1>

        <div className="d-flex flex-column gap-2 mb-4">
          <p>Enter the verification code we sent to your {verifyTypeName}</p>

          <div className="d-flex justify-content-center gap-2">
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
            <div className="text-danger small">
              <FontAwesomeIcon icon={faTriangleExclamation} /> {inputErr}
            </div>
          )}
        </div>

        <Btn
          type="submit"
          className="w-100 btn btn-primary"
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Verify my {verifyTypeName}
        </Btn>
      </form>
    );
  }
);

export default VerifyForm;
