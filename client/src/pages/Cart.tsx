import { useCallback, useEffect, useRef } from "react";
import { centsToUSD } from "../../../common/utils.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate } from "react-router-dom";
import { useUserCartStore } from "../store/cartStore";
import ApiError from "../components/ApiError";
import HorizontalDivider from "../components/HorizontalDivider";
import CartSkeleton from "../components/skeleton/CartSkeleton";
import type { UserCartUpdate } from "../utils/types";
import toast from "react-hot-toast";
import { formatError } from "../utils/utils";
import CartItemCard from "../components/CartItemCard";

export default function Cart() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Cart render count:", renderCount.current);

  const navigate = useNavigate();

  const {
    cart,
    isFetching,
    fetchErr,
    modifyingItemId,
    totalCents,
    isAllItemAvailable,
    fetchCart,
    updateCartItem,
    removeCartItem,
  } = useUserCartStore();

  // Fetch initial when first loaded: cart
  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateItem = useCallback(
    async (
      e: React.ChangeEvent<HTMLSelectElement>,
      variationId: string
    ): Promise<void> => {
      const data: UserCartUpdate = {
        variationId,
        quantity: parseInt(e.target.value, 10),
      };

      try {
        await updateCartItem(data);
        toast.success("Cart item updated successfully!");
      } catch (error) {
        toast.error(formatError(error));
      }
    },
    [updateCartItem]
  );

  const handleRemoveItem = useCallback(
    async (variationId: string): Promise<void> => {
      try {
        await removeCartItem(variationId);
        toast.success("Cart item removed successfully!");
      } catch (error) {
        toast.error(formatError(error));
      }
    },
    [removeCartItem]
  );

  return (
    <main className="container--g">
      {isFetching ? (
        <CartSkeleton />
      ) : fetchErr ? (
        <ApiError errMsg={fetchErr} />
      ) : !cart ? (
        <ApiError errMsg="No cart found. Please try again later." />
      ) : !cart.total ? (
        <div className="text-center">
          <h1 className="mb-4">Your Cart is Empty</h1>
          <Link to="/" className="btn btn-primary">
            <FontAwesomeIcon icon={faShoppingCart} className="me-2" />
            Start shopping
          </Link>
        </div>
      ) : (
        <>
          <h1 className="mb-4 fw-semibold text-center">Cart ({cart.total})</h1>
          <div className="row g-4">
            {/* Cart items on the left */}
            <div className="col-lg-8">
              <div className="d-flex flex-column gap-3">
                {cart.items.map((item) => (
                  <CartItemCard
                    key={item.variation.id}
                    item={item}
                    isLoading={modifyingItemId === item.variation.id}
                    onUpdate={handleUpdateItem}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            </div>

            {/* Summary card on the right */}
            <div className="col-lg-4">
              <div
                className="card shadow-sm position-sticky"
                style={{ top: "1rem" }}
              >
                <div className="card-body">
                  <h2 className="h4 card-title mb-3">Order Summary</h2>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>{centsToUSD(totalCents)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span className="fw-bold">Estimated Total</span>
                    <span className="fw-bold">{centsToUSD(totalCents)}</span>
                  </div>
                  <p className="small text-muted mb-3">
                    Shipping and tax calculated in checkout.
                  </p>
                  <div className="d-grid gap-2">
                    <button
                      type="button"
                      className="btn-premium--g"
                      onClick={() => navigate("/checkout")}
                      disabled={!isAllItemAvailable || !!modifyingItemId}
                    >
                      Check Out
                    </button>
                    <HorizontalDivider text="or" />
                    <Link to="/" className="btn btn-link p-0">
                      Continue Shopping
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
