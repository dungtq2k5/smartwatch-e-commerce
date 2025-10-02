import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { useUserPaymentMethodStore } from "../store/userPaymentMethodStore";
import Loading from "../components/Loading";
import ApiError from "../components/ApiError";
import { Elements } from "@stripe/react-stripe-js";
import AddPaymentMethodForm from "../components/AddPaymentMethodForm";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
);

export default function StripePaymentFormWrapper() {
  const { createStripeSetupIntent } = useUserPaymentMethodStore();

  const [clientSecret, setClientSecret] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  useEffect(() => {
    const handleFetchSetClientSecret = async (): Promise<void> => {
      setIsLoading(true);
      setApiErr(null);

      try {
        const res = await createStripeSetupIntent();
        setClientSecret(res.clientSecret);
      } catch (error) {
        setApiErr(
          error instanceof Error ? error.message : "Failed to load form."
        );
      } finally {
        setIsLoading(false);
      }
    };

    handleFetchSetClientSecret();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: "stripe" },
  };

  return (
    <main className="container--center--g">
      {isLoading ? (
        <Loading loadingMsg="Preparing secure form..." />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !clientSecret ? (
        <ApiError errMsg="Client secret data not found." />
      ) : (
        <Elements options={options} stripe={stripePromise}>
          <AddPaymentMethodForm />
        </Elements>
      )}
    </main>
  );
}
