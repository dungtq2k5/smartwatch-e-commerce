import { Link } from "react-router-dom";
import ApiError from "../../components/common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFaceSadCry,
  faFaceSmileBeam,
} from "@fortawesome/free-solid-svg-icons";
import useUserCartStore from "../../store/user/cartStore";
import { useEffect } from "react";

export default function OrderStatus() {
  const query = new URLSearchParams(globalThis.location.search);
  const paymentMethod = query.get("method") as "stripe" | "cod" | null;
  const status = query.get("redirect_status") as "succeeded" | "failed" | null;

  const { clearCartCache } = useUserCartStore();

  useEffect(() => {
    if (status === "succeeded") clearCartCache();
  }, [clearCartCache, status]);

  return (
    <main className="container--g text-center">
      <h1 className="mb-4">Order Status</h1>
      {!status ? (
        <ApiError errorMessage="Couldn't get redirect_status." />
      ) : (
        <>
          {paymentMethod === "stripe" ? (
            status === "succeeded" ? (
              <p className="text-success">
                <FontAwesomeIcon icon={faFaceSmileBeam} className="me-2" />
                Success! Your payment has been processed. We've received your
                order.
              </p>
            ) : status === "failed" ? (
              <p className="text-danger">
                <FontAwesomeIcon icon={faFaceSadCry} className="me-2" />
                Payment failed. Please try again from the{" "}
                <Link to="/checkout">checkout page</Link> or contact support.
              </p>
            ) : (
              <p>
                Your payment status is currently processing. Please check your
                orders page for the final status shortly.
              </p>
            )
          ) : paymentMethod === "cod" ? (
            status === "succeeded" ? (
              <p className="text-success">
                <FontAwesomeIcon icon={faFaceSmileBeam} className="me-2" />
                Success! Your order has been placed. Please prepare the payment
                upon delivery.
              </p>
            ) : (
              <p className="text-danger">
                <FontAwesomeIcon icon={faFaceSadCry} className="me-2" />
                There was an issue placing your order. Please try again from the{" "}
                <Link to="/checkout">checkout page</Link> or contact support.
              </p>
            )
          ) : (
            <ApiError errorMessage="Couldn't get payment method." />
          )}

          <div className="d-flex gap-2 justify-content-center">
            <Link to="/" className="btn btn-primary">
              Home
            </Link>
            <Link to="/account/purchase" className="btn btn-primary">
              My Purchases
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
