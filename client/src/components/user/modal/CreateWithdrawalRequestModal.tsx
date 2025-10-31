import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useUserBankAccountStore } from "../../../store/user/userBankAccountStore";
import { centsToUSD, formatError } from "../../../../../common/utils.common";
import { Button, Modal } from "react-bootstrap";
import ApiError from "../../common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faBank,
  faCentSign,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import Loading from "../../common/Loading";
import { MIN_WITHDRAWAL_AMOUNT_CENTS } from "../../../../../common/configs.common";
import { useAuthStore } from "../../../store/user/authStore";
import { WAITING_EMOJI } from "../../../configs";
import toast from "react-hot-toast";
import { useUserWithdrawalRequestStore } from "../../../store/user/userWithdrawalRequestStore";
import type { SelfWithdrawalRequestResponse } from "../../../../../common/types.common";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isCreatingAccount: boolean;
  isSubmitting: boolean;
};

type FormData = {
  amountCents: {
    val: number;
    err?: string;
  };
  bankAccountId: string;
};

const CreateWithdrawalRequestModal = memo(
  ({
    show,
    onHide,
    onSuccess,
  }: Readonly<{
    show: boolean;
    onHide: () => void;
    onSuccess?: (newRequest: SelfWithdrawalRequestResponse) => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(
      "CreateWithdrawalRequestModal render count:",
      renderCount.current
    );

    const { user, updateUserBalanceCli } = useAuthStore();
    const { bankAccounts, fetchBankAccounts, setupBankAccount } =
      useUserBankAccountStore();
    const { createWithdrawalRequest } = useUserWithdrawalRequestStore();

    const userBalanceCents = user?.userBalanceCents || 0;

    const [process, setProcess] = useState<Process>({
      isProcessing: true,
      isInitializing: true,
      isCreatingAccount: false,
      isSubmitting: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
      amountCents: {
        val: userBalanceCents || MIN_WITHDRAWAL_AMOUNT_CENTS,
      },
      bankAccountId: "",
    });

    // Fetch on initial loaded: bank accounts
    useEffect(() => {
      const handleFetchSetBankAccounts = async (): Promise<void> => {
        setProcess((prev) => ({
          ...prev,
          isProcessing: true,
          isInitializing: true,
        }));
        setApiErr(null);

        try {
          const bankAccounts = await fetchBankAccounts();

          if (bankAccounts.total > 0) {
            const defaultAcc = bankAccounts.accounts.find(
              (acc) => acc.isDefault
            );
            setFormData((prev) => ({
              ...prev,
              bankAccountId: defaultAcc
                ? defaultAcc.id
                : bankAccounts.accounts[0].id,
            }));
          }
        } catch (error) {
          setApiErr(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isInitializing: false,
          }));
        }
      };

      handleFetchSetBankAccounts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreateBankAccount = useCallback(async (): Promise<void> => {
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isCreatingAccount: true,
      }));

      const bankAccountSetup = await toast.promise(setupBankAccount(), {
        loading: "Ready the bank account setup page...",
        success:
          "Redirecting you to the bank account setup page, please wait...",
        error: (err) => formatError(err),
      });

      globalThis.location.href = bankAccountSetup.setupUrl;

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCreatingAccount: false,
      }));
    }, [process.isProcessing, setupBankAccount]);

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (process.isProcessing) {
          toast("Another request is being processed. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }

        const validateForm = (): boolean => {
          let isValid = true;
          const newFormData: FormData = { ...formData };

          if (formData.amountCents.val < MIN_WITHDRAWAL_AMOUNT_CENTS) {
            newFormData.amountCents.err = `Minimum withdrawal amount is ${centsToUSD(
              MIN_WITHDRAWAL_AMOUNT_CENTS
            )} (${MIN_WITHDRAWAL_AMOUNT_CENTS}¢).`;
            isValid = false;
          } else if (formData.amountCents.val > userBalanceCents) {
            newFormData.amountCents.err = `You cannot withdraw more than your current balance of ${centsToUSD(
              userBalanceCents
            )} (${userBalanceCents}¢).`;
            isValid = false;
          }

          setFormData(newFormData);
          return isValid;
        };

        if (validateForm()) {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isSubmitting: true,
          }));

          try {
            const request = await createWithdrawalRequest({
              amountCents: formData.amountCents.val,
              bankAccountId: formData.bankAccountId,
            });
            updateUserBalanceCli(userBalanceCents - formData.amountCents.val);

            onSuccess?.(request);
            onHide();
            toast.success("Withdrawal request created successfully.");
          } catch (error) {
            setApiErr(formatError(error));
          } finally {
            setProcess((prev) => ({
              ...prev,
              isProcessing: false,
              isSubmitting: false,
            }));
          }
        }
      },
      [createWithdrawalRequest, formData, onHide, onSuccess, process.isProcessing, updateUserBalanceCli, userBalanceCents]
    );

    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Withdrawal Request</Modal.Title>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body>
            {process.isInitializing ? (
              <Loading loadingMsg="Loading bank accounts..." />
            ) : apiErr ? (
              <ApiError errMsg={apiErr} />
            ) : !bankAccounts ? (
              <ApiError errMsg="Bank accounts data not found." />
            ) : bankAccounts.total === 0 ? (
              <p>You don't have any bank accounts. Please add one first</p>
            ) : (
              <>
                {/* Enter amount */}
                <div className="mb-3">
                  <label htmlFor="amountCents" className="mb-2">
                    Amount to withdraw (in cents):
                  </label>
                  <div className="ms-2">
                    <div className="input-group">
                      <span className="input-group-text">
                        <FontAwesomeIcon icon={faCentSign} />
                      </span>
                      <input
                        type="number"
                        id="amountCents"
                        name="amountCents"
                        className="form-control"
                        min={MIN_WITHDRAWAL_AMOUNT_CENTS}
                        max={userBalanceCents}
                        value={formData.amountCents.val}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            amountCents: { val: Number(e.target.value) },
                          }))
                        }
                        aria-describedby="amountCentsHelp"
                        disabled={process.isProcessing}
                      />
                      <span className="input-group-text">
                        = {centsToUSD(formData.amountCents.val)}
                      </span>
                    </div>
                    <div id="amountCentsHelp" className="form-text mt-1">
                      Minimum withdrawal amount is{" "}
                      {centsToUSD(MIN_WITHDRAWAL_AMOUNT_CENTS)} (
                      {MIN_WITHDRAWAL_AMOUNT_CENTS}&#65504;). Your current
                      balance is {centsToUSD(userBalanceCents)} (
                      {userBalanceCents}&#65504;).
                    </div>
                    {formData.amountCents.err && (
                      <div className="text-danger small mt-1">
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          className="me-2"
                        />
                        {formData.amountCents.err}
                      </div>
                    )}
                  </div>
                </div>

                {/* Select account */}
                <div>
                  <p className="mb-2">Select an account to transfer to:</p>
                  <div className="d-flex flex-column gap-2 ms-2">
                    {bankAccounts.accounts.map((acc) => {
                      const htmlFor = `bank-account-${acc.id}`;
                      const isAvailable =
                        acc.isVerified &&
                        acc.accountStatus === "enabled" &&
                        !acc.requiresAction;

                      return (
                        <div
                          key={acc.id}
                          className="form-check border rounded p-3 gap-2"
                        >
                          <input
                            type="radio"
                            name="account-select"
                            id={htmlFor}
                            className="form-check-input"
                            value={acc.id}
                            checked={formData.bankAccountId === acc.id}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                bankAccountId: e.target.value,
                              }))
                            }
                            disabled={!isAvailable || process.isProcessing}
                          />
                          <label
                            htmlFor={htmlFor}
                            className={`form-check-label d-flex gap-2 address-select-label--g ${
                              !isAvailable ? "opacity-50" : ""
                            }`}
                          >
                            <FontAwesomeIcon icon={faBank} size="xl" />
                            <div>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <h2 className="mb-0 fs-5 fw-bold text-capitalize">
                                  {acc.bankName}{" "}
                                  <span className="text-muted fw-normal">
                                    **** {acc.last4}
                                  </span>
                                </h2>
                                {acc.isVerified ? (
                                  <span className="badge text-bg-success">
                                    Verified
                                  </span>
                                ) : (
                                  <span className="badge text-bg-warning">
                                    Unverified
                                  </span>
                                )}
                                {acc.isDefault && (
                                  <span className="badge text-bg-primary">
                                    Default
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="mb-0 text-muted small">
                                  Full Name: {acc.accountHolderName}
                                </p>
                                <p className="mb-0 text-muted small">
                                  Type: {acc.accountType}
                                </p>
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr />

                <button
                  type="button"
                  className="btn btn-outline-primary w-100"
                  onClick={handleCreateBankAccount}
                  disabled={process.isProcessing}
                >
                  {process.isCreatingAccount ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      <output>Adding...</output>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon
                        icon={faPlus}
                        size="sm"
                        className="me-2"
                      />
                      Add New Bank Account
                    </>
                  )}
                </button>
              </>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="button"
              variant="secondary"
              onClick={onHide}
              disabled={process.isProcessing}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!formData.bankAccountId || process.isProcessing}
            >
              {process.isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  ></span>
                  <output>Sending...</output>
                </>
              ) : (
                <>Send withdrawal request</>
              )}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    );
  }
);

export default CreateWithdrawalRequestModal;
