import { Link } from "react-router-dom";
import ApiError from "../components/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFaceSadCry,
  faFaceSmileBeam,
} from "@fortawesome/free-solid-svg-icons";
import { useUserCartStore } from "../store/cartStore";
import { useEffect } from "react";

export default function OrderStatus() {
  const query = new URLSearchParams(window.location.search);
  const status = query.get("redirect_status");

  const { clearCart } = useUserCartStore();

  useEffect(() => {
    if (status === "succeeded") clearCart();
  }, [clearCart, status]);

  return (
    <main className="container--g text-center">
      <h1 className="mb-4">Order Status</h1>
      {!status ? (
        <ApiError errMsg="Couldn't get redirect_status." />
      ) : (
        <>
          {status === "succeeded" ? (
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
          )}
          <Link to="/account/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </>
      )}
    </main>
  );
}
