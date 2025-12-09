import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faBank,
  faPlus,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import useUserPaymentMethodStore from "../../../store/user/userPaymentMethodStore";
import { formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Loading from "../../common/Loading";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConfirmSubmitModal from "../modal/ConfirmSubmitModal";
import {
  CARD_BRAND_ICONS,
  USER_BANK_ACCOUNT_STATUS_LEGEND,
  WAITING_EMOJI,
} from "../../../configs";
import toast from "react-hot-toast";
import SmallSpinner from "../../common/SmallSpinner";
import useUserBankAccountStore from "../../../store/user/userBankAccountStore";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isSettingDefaultCard: boolean;
  isDeletingCard: boolean;
  isCreatingBankAccount: boolean;
  isDeletingBankAccount: boolean;
  isSettingDefaultBankAccount: boolean;
  isVerifyingBankAccount: boolean;
};

type Modal = {
  cardIdToDelete: string | null;
  bankAccountIdToDelete: string | null;
};

export default function BankAndCard() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("BankAndCard render count:", renderCount.current);

  const navigate = useNavigate();

  const {
    paymentMethods,
    fetchPaymentMethods,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  } = useUserPaymentMethodStore();
  const {
    bankAccounts,
    fetchBankAccounts,
    setupBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
    refreshOnboardingUrl,
  } = useUserBankAccountStore();

  const [searchParams, setSearchParams] = useSearchParams();

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isSettingDefaultCard: false,
    isDeletingCard: false,
    isCreatingBankAccount: false,
    isDeletingBankAccount: false,
    isSettingDefaultBankAccount: false,
    isVerifyingBankAccount: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    cardIdToDelete: null,
    bankAccountIdToDelete: null,
  });

  // Handle redirect back after creating bank account from Stripe page
  useEffect((): void => {
    const setupStatus = searchParams.get("setup");
    if (setupStatus === "complete") {
      toast.success("Bank account details updated.");
      // Clean up the URL
      searchParams.delete("setup");
      setSearchParams(searchParams, { replace: true });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect((): void => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        await Promise.all([
          paymentMethods ? Promise.resolve() : fetchPaymentMethods(),
          bankAccounts ? Promise.resolve() : fetchBankAccounts(),
        ]);
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

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/payment/create");
  }, [navigate, process.isProcessing]);

  const handleSubmitDeleteCard = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!modal.cardIdToDelete) {
      toast.error("Payment method id to delete not found.");
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isDeletingCard: true,
    }));
    try {
      await deletePaymentMethod(modal.cardIdToDelete);
      toast.success("Payment method deleted successfully.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isDeletingCard: false,
      }));
    }
  }, [deletePaymentMethod, modal.cardIdToDelete, process.isProcessing]);

  const handleSetDefaultCard = useCallback(
    async (methodId: string): Promise<void> => {
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isSettingDefaultCard: true,
      }));
      try {
        await setDefaultPaymentMethod(methodId);
        toast.success("Default payment method updated successfully.");
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isSettingDefaultCard: false,
        }));
      }
    },
    [process.isProcessing, setDefaultPaymentMethod]
  );

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
      isCreatingBankAccount: true,
    }));

    const bankAccountSetup = await toast.promise(setupBankAccount(), {
      loading: "Ready the bank account setup page...",
      success: "Redirecting you to the bank account setup page, please wait...",
      error: (err) => formatError(err),
    });

    globalThis.location.href = bankAccountSetup.setupUrl; // Redirect takes time

    setProcess((prev) => ({
      ...prev,
      isProcessing: false,
      isCreatingBankAccount: false,
    }));
  }, [process.isProcessing, setupBankAccount]);

  const handleSubmitDeleteBankAccount = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    if (!modal.bankAccountIdToDelete) {
      toast.error("Bank account id to delete not found.");
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isDeletingBankAccount: true,
    }));
    try {
      await deleteBankAccount(modal.bankAccountIdToDelete);
      toast.success("Bank account deleted successfully.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isDeletingBankAccount: false,
      }));
    }
  }, [deleteBankAccount, modal.bankAccountIdToDelete, process.isProcessing]);

  const handleSetDefaultBankAccount = useCallback(
    async (accountId: string): Promise<void> => {
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isSettingDefaultBankAccount: true,
      }));
      try {
        await setDefaultBankAccount(accountId);
        toast.success("Default bank account updated successfully.");
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isSettingDefaultBankAccount: false,
        }));
      }
    },
    [process.isProcessing, setDefaultBankAccount]
  );

  const handleVerifyBankAccount = useCallback(
    async (bankAccountId: string): Promise<void> => {
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isVerifyingBankAccount: true,
      }));

      const bankAccountSetup = await toast.promise(
        refreshOnboardingUrl(bankAccountId),
        {
          loading: "Ready the bank account verification page...",
          success:
            "Redirecting you to the bank account verification page, please wait...",
          error: (err) => formatError(err),
        }
      );

      globalThis.location.href = bankAccountSetup.setupUrl; // Redirect takes time

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isVerifyingBankAccount: false,
      }));
    },
    [process.isProcessing, refreshOnboardingUrl]
  );

  const closeModal = useCallback((): void => {
    setModal({
      cardIdToDelete: null,
      bankAccountIdToDelete: null,
    });
  }, []);

  return (
    <>
      {process.isInitializing ? (
        <Loading loadingMsg="Hang on we are loading payment methods..." />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !paymentMethods ? (
        <ApiError errMsg="Payment methods data not found." />
      ) : !bankAccounts ? (
        <ApiError errMsg="Bank accounts data not found." />
      ) : (
        <>
          {/* Cards section */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
              <h1 className="h3 card-title">Credit / Debit Card</h1>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateCard}
                disabled={process.isProcessing}
              >
                <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
                Add new card
              </button>
            </div>

            {paymentMethods.total === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">
                  You have not added any payment methods yet.
                </p>
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleCreateCard}
                  disabled={process.isProcessing}
                >
                  Add a payment method
                </button>
              </div>
            ) : (
              <div className="list-group">
                {paymentMethods.methods.map((method) => (
                  <div
                    key={method.id}
                    className="list-group-item d-flex justify-content-between align-items-center p-3"
                  >
                    <div className="d-flex align-items-center gap-3">
                      {method.type === "card" ? (
                        CARD_BRAND_ICONS[method.card.brand.toLowerCase()] || (
                          <FontAwesomeIcon icon={faCreditCard} size="2x" />
                        )
                      ) : (
                        <FontAwesomeIcon icon={faBank} size="2x" />
                      )}
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h2 className="mb-0 fs-5 fw-bold text-capitalize">
                            {method.card.brand}{" "}
                            <span className="text-muted fw-normal">
                              **** {method.card.last4}
                            </span>
                          </h2>
                          {method.isDefault && (
                            <span className="badge text-bg-primary">
                              Default
                            </span>
                          )}
                        </div>
                        {method.type === "card" && (
                          <p className="mb-0 text-muted small">
                            Expires{" "}
                            {String(method.card.expMonth).padStart(2, "0")}/
                            {method.card.expYear}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ms-3 text-end d-flex flex-column gap-1 align-items-end">
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            cardIdToDelete: method.id,
                          }))
                        }
                        disabled={process.isProcessing}
                      >
                        Delete
                      </button>
                      {!method.isDefault && (
                        <button
                          type="button"
                          className="btn btn-link p-0"
                          onClick={() => handleSetDefaultCard(method.id)}
                          disabled={process.isProcessing}
                        >
                          {process.isSettingDefaultCard ? (
                            <SmallSpinner />
                          ) : (
                            "Set as Default"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bank accounts section */}
          <div className="mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
              <h2 className="h3 card-title">My Bank Accounts</h2>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateBankAccount}
                disabled={process.isProcessing}
              >
                {process.isCreatingBankAccount ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    <output>Adding...</output>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
                    Add new bank account
                  </>
                )}
              </button>
            </div>

            {bankAccounts.total === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">
                  You have not added any bank accounts yet.
                </p>
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={handleCreateBankAccount}
                  disabled={process.isProcessing}
                >
                  {process.isCreatingBankAccount ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      <output>Adding...</output>
                    </>
                  ) : (
                    "Add a bank account"
                  )}
                </button>
              </div>
            ) : (
              <div className="list-group">
                {bankAccounts.accounts.map((account) => {
                  const statusMsg =
                    USER_BANK_ACCOUNT_STATUS_LEGEND[
                      account.accountStatus as keyof typeof USER_BANK_ACCOUNT_STATUS_LEGEND
                    ];
                  const unableAccount = ["restricted", "rejected"].includes(
                    account.accountStatus
                  ); // For faded effect

                  return (
                    <div
                      key={account.id}
                      className="list-group-item d-flex justify-content-between align-items-center p-3"
                    >
                      <div
                        className={`d-flex align-items-center gap-3 ${
                          unableAccount ? "opacity-75" : ""
                        }`}
                      >
                        <FontAwesomeIcon icon={faBank} size="2x" />
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <h2 className="mb-0 fs-5 fw-bold text-capitalize">
                              {account.bankName}{" "}
                              <span className="text-muted fw-normal">
                                **** {account.last4}
                              </span>
                            </h2>

                            {account.isVerified ? (
                              <span className="badge text-bg-success">
                                Verified
                              </span>
                            ) : (
                              <span className="badge text-bg-warning">
                                Unverified
                              </span>
                            )}
                            {account.isDefault && (
                              <span className="badge text-bg-primary">
                                Default
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="mb-0 text-muted small">
                              Full Name: {account.accountHolderName}
                            </p>
                            <p className="mb-0 text-muted small">
                              Type: {account.accountType}
                            </p>
                          </div>

                          {statusMsg && (
                            <div className="mt-2 text-danger fw-semibold d-flex align-items-center small gap-1">
                              <FontAwesomeIcon icon={faCircleExclamation} />
                              {statusMsg}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ms-3 text-end d-flex flex-column gap-1 align-items-end">
                        <button
                          type="button"
                          className="btn btn-link text-danger p-0"
                          onClick={() =>
                            setModal((prev) => ({
                              ...prev,
                              bankAccountIdToDelete: account.id,
                            }))
                          }
                          disabled={process.isProcessing}
                        >
                          Delete
                        </button>
                        {account.isVerified &&
                          account.accountStatus === "enabled" &&
                          !account.isDefault && (
                            <button
                              type="button"
                              className="btn btn-link p-0"
                              onClick={() =>
                                handleSetDefaultBankAccount(account.id)
                              }
                              disabled={process.isProcessing}
                            >
                              {process.isSettingDefaultBankAccount ? (
                                <SmallSpinner />
                              ) : (
                                "Set as Default"
                              )}
                            </button>
                          )}
                        {!account.isVerified &&
                          account.accountStatus === "pending" && (
                            <button
                              type="button"
                              className="btn btn-link p-0"
                              onClick={() =>
                                handleVerifyBankAccount(account.id)
                              }
                              disabled={process.isProcessing}
                            >
                              {process.isVerifyingBankAccount ? (
                                <SmallSpinner />
                              ) : (
                                "Verify Account"
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modals */}
          <ConfirmSubmitModal
            show={!!modal.cardIdToDelete}
            onHide={closeModal}
            onSubmit={handleSubmitDeleteCard}
            custom={{
              action: "delete",
              title: "Delete Payment Method",
              body: "Are you sure you want to delete this payment method? This action cannot be undone.",
              cancelText: "Cancel",
              submitText: "Delete",
            }}
          />

          <ConfirmSubmitModal
            show={!!modal.bankAccountIdToDelete}
            onHide={closeModal}
            onSubmit={handleSubmitDeleteBankAccount}
            custom={{
              action: "delete",
              title: "Delete Bank Account",
              body: "Are you sure you want to delete this bank account? This action cannot be undone.",
              cancelText: "Cancel",
              submitText: "Delete",
            }}
          />
        </>
      )}
    </>
  );
}
