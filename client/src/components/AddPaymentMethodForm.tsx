import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripePaymentElementOptions } from "@stripe/stripe-js";
import { useCallback, useState, type FormEvent } from "react";
import { formatError } from "../../../common/utils.common";
import type { UserPaymentMethodCreate } from "../../../common/types.common";
import { useUserPaymentMethodStore } from "../store/userPaymentMethodStore";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ConfirmSubmitModal from "./modal/ConfirmSubmitModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { LINK_FAST_CHECKOUT_URL, STRIPE_URL } from "../configs";

export default function AddPaymentMethodForm() {
  const stripe = useStripe();
  const elements = useElements();

  const navigate = useNavigate();

  const { createPaymentMethod } = useUserPaymentMethodStore();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [cancelModal, setCancelModal] = useState<boolean>(false);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!stripe || !elements) return; // Stripe.js has not yet loaded.

      setIsProcessing(true);
      setApiErr(null);

      try {
        const { error: confirmError, setupIntent } = await stripe.confirmSetup({
          elements,
          redirect: "if_required", // Do not redirect after confirmation
        });
        if (confirmError) {
          throw new Error(confirmError.message || "An unknown error occurred.");
        }

        if (setupIntent?.status !== "succeeded") {
          throw new Error(
            `SetupIntent status: ${setupIntent?.status}. Payment method not saved.`
          );
        }

        // Save to backend
        const payload: UserPaymentMethodCreate = {
          stripePaymentMethodId: setupIntent.payment_method as string,
        };
        await createPaymentMethod(payload);

        navigate("/account/bank-card");
        toast.success("New payment method added successfully.");
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setIsProcessing(false);
      }
    },
    [createPaymentMethod, elements, navigate, stripe]
  );

  const paymentElementOptions: StripePaymentElementOptions = {
    layout: "tabs",
  };

  return (
    <>
      <form className="border rounded-3 shadow-sm p-4" onSubmit={handleSubmit}>
        <div className="mb-4">
          <h1 className="h3 fw-normal mb-0">Add credit/debit card</h1>
          <p className="mb-0 text-muted">
            Powered by{" "}
            <Link
              to={STRIPE_URL}
              className="text-decoration-none fw-bold"
              style={{ color: "var(--stripe-main-color)" }}
              target="_blank"
            >
              Stripe
            </Link>
            , we recommend that you use{" "}
            <Link
              to={LINK_FAST_CHECKOUT_URL}
              className="text-decoration-none fw-bold"
              style={{ color: "var(--stripe-link-main-color)" }}
              target="_blank"
            >
              Link
            </Link>{" "}
            for the most convenient.
          </p>
        </div>

        <PaymentElement options={paymentElementOptions} />

        {apiErr && (
          <div className="alert alert-danger mt-3">
            <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
            {apiErr}
          </div>
        )}

        <div className="d-flex w-100 gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary w-100"
            onClick={() => setCancelModal(true)}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={!stripe || !elements || isProcessing}
          >
            {isProcessing ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Saving...</output>
              </>
            ) : (
              "Save Card"
            )}
          </button>
        </div>
      </form>

      <ConfirmSubmitModal
        show={cancelModal}
        onHide={() => setCancelModal(false)}
        onSubmit={() => {
          navigate(-1);
        }}
        custom={{
          action: "leave",
          title: "Discard information?",
          body: "The information you filled on this page will not be saved if you leave now. Are you sure you want to leave?",
          cancelText: "Stay",
          submitText: "Leave",
        }}
      />
    </>
  );
}
