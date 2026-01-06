import {
  faArrowRight,
  faDollarSign,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAuthStore from "../../store/user/authStore";
import ApiError from "../../components/common/ApiError";
import useUserAddressStore from "../../store/user/addressStore";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import type {
  OrderCreate,
  PaymentMethodResponse,
  UserSelfAddressResponse,
  UserCartListResponse,
} from "../../../../common/types.common";
import {
  capEveryFirstLetter,
  centsToUSD,
  formatError,
} from "../../../../common/utils.common";
import useUserCartStore from "../../store/user/cartStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import defaultProductImg from "../../assets/default-product.webp";
import SlashColor from "../../components/common/SlashColor";
import CreateAddressModal from "../../components/user/modal/CreateAddressModal";
import usePaymentMethodStore from "../../store/common/order/paymentMethodStore";
import SelectAddressModal from "../../components/user/modal/SelectAddressModal";
import { faCcStripe } from "@fortawesome/free-brands-svg-icons";
import useOrderStore from "../../store/user/orderStore";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../configs";
import CheckoutSkeleton from "../../components/user/skeleton/CheckoutSkeleton";
import type { BuyNowItem } from "../../utils/types";
import Btn from "../../components/common/Btn";

// Handle both UserCartListResponse and BuyNowItem
type CheckoutCart =
  | ({
      readonly type: "UserCartListResponse";
    } & UserCartListResponse)
  | ({
      readonly type: "BuyNowItem";
    } & BuyNowItem);

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isGettingDefaultAddress: boolean;
  isCreatingOrder: boolean;
};

type Modal = {
  addAddress: boolean;
  changeAddress: boolean;
};

export default function Checkout() {
  // DEV temp for testing
  const count = useRef(0);
  count.current += 1;
  console.log("Checkout render count:", count.current);

  const navigate = useNavigate();
  const location = useLocation();
  const buyNowItem = location.state?.buyNowItem as BuyNowItem | undefined; // Get via Browser history state

  const { user, resetUserBalanceCache } = useAuthStore();
  const { addresses, fetchDefaultAddress } = useUserAddressStore();
  const {
    totalCents: cartTotalCents,
    isAllItemAvailable: cartIsAllItemAvailable,
    fetchCart,
    clearCartCache,
  } = useUserCartStore();
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethodStore();
  const { createOrder, createCheckoutSession } = useOrderStore();

  const totalCents = buyNowItem ? buyNowItem.totalCents : cartTotalCents;
  const isAllItemAvailable = buyNowItem ? true : cartIsAllItemAvailable;

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isGettingDefaultAddress: true,
    isCreatingOrder: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [checkoutCart, setCheckoutCart] = useState<CheckoutCart | undefined>(
    buyNowItem
      ? {
          type: "BuyNowItem",
          ...buyNowItem,
        }
      : undefined
  );

  const [selectedAddress, setSelectedAddress] =
    useState<UserSelfAddressResponse | null>(null);
  const [modal, setModal] = useState<Modal>({
    addAddress: false,
    changeAddress: false,
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    PaymentMethodResponse | undefined
  >(undefined);

  const [applyUserBalance, setApplyUserBalance] = useState<boolean>(false);

  // Fetch initial when first loaded: addresses, cart, payment methods (set), checkoutCart
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      if (!user) return;

      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      try {
        const [fetchedCart, fetchedPaymentMethods] = await Promise.all([
          buyNowItem ? Promise.resolve(null) : fetchCart(),
          paymentMethods
            ? Promise.resolve(paymentMethods)
            : fetchPaymentMethods(),
        ]);

        // If buyNowItem isn't provided, fetch the cart
        if (fetchedCart) {
          setCheckoutCart({
            type: "UserCartListResponse",
            ...fetchedCart,
          });
        }

        // Fetch and set payment methods
        setSelectedPaymentMethod(fetchedPaymentMethods.methods[0]);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isFetching: false,
        }));
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch default address when first loaded or addressesList changes
  useEffect(() => {
    const handleSetDefaultAddress = async (): Promise<void> => {
      if (!user) return;

      // If an address is already selected, find its updated version in the new list
      // to ensure its data (e.g., isDefault status) is fresh.
      if (selectedAddress && addresses) {
        const updatedSelectedAddress =
          addresses.addresses.find((addr) => addr.id === selectedAddress.id) ||
          null;
        setSelectedAddress(updatedSelectedAddress);
        return;
      }

      // If no address is selected (e.g., on initial load), set the default one.
      if (!selectedAddress) {
        setProcess((prev) => ({
          ...prev,
          isProcessing: true,
          isGettingDefaultAddress: true,
        }));

        try {
          const defaultAddress = await fetchDefaultAddress();
          setSelectedAddress(defaultAddress);
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isGettingDefaultAddress: false,
          }));
        }
      }
    };

    handleSetDefaultAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const genItemsList = useCallback(
    (checkoutCart: CheckoutCart): JSX.Element | null => {
      const items =
        checkoutCart.type === "BuyNowItem"
          ? [checkoutCart]
          : checkoutCart.items;
      return (
        <ul className="list-group list-group-flush">
          {items.map((item) => (
            <li
              key={item.variation.id}
              className="list-group-item d-flex align-items-center"
            >
              <img
                src={item.variation.imageUrls[0] || defaultProductImg}
                alt={`${item.variation.productModel.product.name} - ${item.variation.productModel.name}`}
                className="checkout-item-img--g me-3"
              />
              <div className="flex-grow-1">
                <p className="mb-1 fw-bold small">
                  {item.variation.productModel.product.name} -{" "}
                  {item.variation.productModel.name}
                </p>
                <p className="mb-1 text-muted small">
                  <SlashColor
                    hexColor={item.variation.color.hex}
                    className="me-1"
                  />
                  {item.variation.color.name}
                </p>
                <p className="mb-0 text-muted small">
                  Quantity: {item.quantity}
                </p>
              </div>
              <div className="text-end">
                <p className="mb-0 fw-bold small">
                  {centsToUSD(item.totalCents)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      );
    },
    []
  );

  const closeModal = useCallback((): void => {
    setModal({
      addAddress: false,
      changeAddress: false,
    });
  }, []);

  const handleSelectAddress = useCallback(
    (addressId: string): void => {
      const newSelectedAddress = addresses?.addresses.find(
        (addr) => addr.id === addressId
      );
      if (newSelectedAddress) setSelectedAddress(newSelectedAddress);
    },
    [addresses]
  );

  const genPaymentMethodBody = useCallback(
    (method: PaymentMethodResponse): JSX.Element => {
      let textDisplay: string;

      switch (method.name) {
        case "cash":
          textDisplay =
            "You have selected pay by cash (COD) for this order, please prepare the money when the products are delivered to you.";
          break;
        case "stripe":
          textDisplay =
            "You have selected pay by card, please proceed to enter your card details on the next page.";
          break;
        default:
          textDisplay = "Unknown payment method selected.";
      }

      return (
        <div className="d-flex gap-2">
          <FontAwesomeIcon icon={faArrowRight} className="mt-1" />
          <p className="m-0">{textDisplay}</p>
        </div>
      );
    },
    []
  );

  const handleCheckout = useCallback(async (): Promise<void> => {
    // By cash -> submit and order
    // By Stripe -> redirect to Stripe payment page

    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    if (!selectedPaymentMethod || !selectedAddress || !checkoutCart) {
      toast.error(
        !selectedPaymentMethod
          ? "Please select a payment method."
          : !selectedAddress
          ? "Please select a delivery address."
          : "Cart is empty or not available."
      );
      return;
    }

    const order: OrderCreate = {
      userAddressId: selectedAddress.id,
      paymentMethodId: selectedPaymentMethod.id,
      applyUserBalance,
      items:
        checkoutCart.type === "BuyNowItem"
          ? [
              {
                variationId: checkoutCart.variation.id,
                quantity: checkoutCart.quantity,
              },
            ]
          : checkoutCart.items.map((item) => ({
              variationId: item.variation.id,
              quantity: item.quantity,
            })),
    };

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isCreatingOrder: true,
    }));
    try {
      const newOrder = await createOrder(order);

      if (applyUserBalance) resetUserBalanceCache();

      if (selectedPaymentMethod.name === "cash") {
        navigate(`/order-status?method=cod&redirect_status=succeeded`, {
          replace: true,
        });

        if (checkoutCart.type === "UserCartListResponse") {
          clearCartCache();
        }

        toast.success("Successfully ordering!");
        return;
      }

      if (selectedPaymentMethod.name === "stripe") {
        const checkout = await createCheckoutSession(newOrder.id);

        // Redirect to Stripe checkout session
        globalThis.location.href = checkout.url;
      }
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCreatingOrder: false,
      }));
    }
  }, [
    applyUserBalance,
    checkoutCart,
    clearCartCache,
    createCheckoutSession,
    createOrder,
    navigate,
    process.isProcessing,
    resetUserBalanceCache,
    selectedAddress,
    selectedPaymentMethod,
  ]);

  return (
    <>
      <main className="container--g">
        <h1 className="mb-4 text-center">Checkout</h1>

        {!user ? (
          <ApiError errMsg="User data is not available." />
        ) : process.isFetching ? (
          <CheckoutSkeleton />
        ) : apiErr ? (
          <ApiError errMsg={apiErr} />
        ) : !checkoutCart ? (
          <ApiError errMsg="Cart data is not available." />
        ) : !paymentMethods ? (
          <ApiError errMsg="Payment methods data is not available." />
        ) : !selectedPaymentMethod ? (
          <ApiError errMsg="Selected payment method data is not available." />
        ) : (checkoutCart.type === "UserCartListResponse" &&
            !checkoutCart.total) ||
          !isAllItemAvailable ? (
          <div className="text-center">
            <p>You don't have any available items to checkout.</p>
            <Link to="/cart" className="btn btn-primary">
              Back to Cart
            </Link>
          </div>
        ) : (
          <div className="row">
            {/* Container on the left */}
            <div className="col-md-8">
              {/* Delivery address section*/}
              <div className="card shadow--g mb-4">
                {/* Header */}
                <div className="card-header bg-white py-3">
                  <h2 className="h5 mb-0">
                    <FontAwesomeIcon
                      icon={faLocationDot}
                      className="me-2 text-primary"
                    />
                    Delivery Address
                  </h2>
                </div>
                {/* Body */}
                <div className="card-body">
                  {!selectedAddress ? (
                    <p className="m-0">
                      You don't have any address,{" "}
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            addAddress: true,
                          }))
                        }
                      >
                        add one now.
                      </button>
                    </p>
                  ) : (
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="fw-bold mb-1">
                          {selectedAddress.name} ({selectedAddress.phoneNumber})
                          {selectedAddress.isDefault && (
                            <span className="badge bg-primary ms-2">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="mb-0 text-muted">
                          {selectedAddress.fullAddress}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() =>
                          setModal((prev) => ({
                            ...prev,
                            changeAddress: true,
                          }))
                        }
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment method section */}
              <div className="card shadow--g">
                {/* Header */}
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="h5 mb-0">
                    <FontAwesomeIcon
                      icon={faDollarSign}
                      className="me-2 text-primary"
                    />
                    Payment Method
                  </h2>
                  {/* Methods list */}
                  <div className="d-flex gap-2">
                    {paymentMethods.methods.map((method) => (
                      <button
                        type="button"
                        key={method.id}
                        className={`btn btn-sm ${
                          selectedPaymentMethod.id === method.id
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }`}
                        onClick={() => setSelectedPaymentMethod(method)}
                      >
                        {capEveryFirstLetter(
                          method.name === "stripe" ? "card" : method.name
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Body */}
                <div className="card-body">
                  {genPaymentMethodBody(selectedPaymentMethod)}
                </div>
              </div>
            </div>

            {/* Products ordered section - on the right */}
            <div className="col-md-4">
              <div className="card shadow--g">
                <div className="card-header bg-white py-3">
                  <h2 className="h5 mb-0">Checkout Summary</h2>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>{centsToUSD(totalCents)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Shipping</span>
                    <span className="text-success">Free</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Estimated Tax</span>
                    <span>Free</span>
                  </div>
                  {user.userBalanceCents > 0 && (
                    <>
                      <div className="form-check mb-3">
                        <input
                          type="checkbox"
                          id="applyUserBalance"
                          name="applyUserBalance"
                          className="form-check-input"
                          checked={applyUserBalance}
                          onChange={(e) =>
                            setApplyUserBalance(e.target.checked)
                          }
                        />
                        <label htmlFor="applyUserBalance">
                          Use my balance ({centsToUSD(user.userBalanceCents)})
                          for this purchase.
                        </label>
                      </div>
                      {applyUserBalance && (
                        <div className="d-flex justify-content-between mb-3">
                          <span>Balance Applied</span>
                          <span className="text-success">
                            -
                            {centsToUSD(
                              Math.min(totalCents, user.userBalanceCents)
                            )}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <hr />

                  <div className="d-flex justify-content-between fw-bold h5 mb-4">
                    <span>Estimated Total</span>
                    <span>
                      {applyUserBalance
                        ? centsToUSD(
                            Math.max(totalCents - user.userBalanceCents, 0)
                          )
                        : centsToUSD(totalCents)}
                    </span>
                  </div>
                  <Btn
                    type="button"
                    className="btn btn-primary w-100"
                    disabled={process.isProcessing}
                    onClick={handleCheckout}
                    loading={process.isCreatingOrder}
                    icon={
                      selectedPaymentMethod.name === "stripe" ? (
                        <FontAwesomeIcon icon={faCcStripe} />
                      ) : undefined
                    }
                  >
                    {selectedPaymentMethod.name === "cash"
                      ? "Submit & Order"
                      : selectedPaymentMethod.name === "stripe"
                      ? "Continue with Stripe"
                      : "Proceed to Payment"}
                  </Btn>
                </div>
                {/* Checkout items */}
                {genItemsList(checkoutCart)}
                {!buyNowItem && (
                  <div className="card-footer bg-white text-center">
                    <Link to="/cart">Edit Cart</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateAddressModal
        isFirstAddress={!addresses || addresses.total === 0}
        show={modal.addAddress}
        onHide={closeModal}
        onSuccess={handleSelectAddress}
      />
      <SelectAddressModal
        currentAddressId={selectedAddress?.id}
        show={modal.changeAddress}
        onHide={closeModal}
        onSelect={handleSelectAddress}
      />
    </>
  );
}
