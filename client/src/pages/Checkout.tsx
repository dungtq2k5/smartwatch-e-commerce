import {
  faArrowRight,
  faDollarSign,
  faLocationDot,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthStore } from "../store/authStore";
import ApiError from "../components/ApiError";
import { useUserAddressStore } from "../store/addressStore";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import type {
  CheckoutSessionResponse,
  OrderCreate,
  PaymentMethodResponse,
  UserAddressResponse,
  UserCartListResponse,
} from "../../../common/types.common";
import { capEveryFirstLetter, centsToUSD } from "../../../common/utils.common";
import { useUserCartStore } from "../store/cartStore";
import { Link, useNavigate } from "react-router-dom";
import defaultProductImg from "../assets/default-product.webp";
import SlashColor from "../components/SlashColor";
import CreateAddressModal from "../components/modal/CreateAddressModal";
import { usePaymentMethodStore } from "../store/paymentMethodStore";
import SelectAddressModal from "../components/modal/SelectAddressModal";
import { faCcStripe } from "@fortawesome/free-brands-svg-icons";
import { useUserOrderStore } from "../store/orderStore";
import toast from "react-hot-toast";
import { formatError, post } from "../utils/utils";
import SmallSpinner from "../components/SmallSpinner";
import { ORDER_URL } from "../configs";
import CheckoutSkeleton from "../components/skeleton/CheckoutSkeleton";

type ModalState = {
  addAddress: boolean;
  changeAddress: boolean;
};

export default function Checkout() {
  // DEV temp for testing
  const count = useRef(0);
  count.current += 1;
  console.log("Checkout render count:", count.current);

  const navigate = useNavigate();

  const { user, resetUserBalance } = useAuthStore();
  const {
    isGetting: isGettingAddress,
    getErr: fetchAddressErr,
    addresses,
    getDefaultAddress,
  } = useUserAddressStore();
  const {
    isFetching: isFetchingCart,
    fetchErr: fetchCartErr,
    cart,
    totalCents,
    isAllItemAvailable,
    fetchCart,
    clearCart,
  } = useUserCartStore();
  const {
    isFetching: isFetchingPaymentMethods,
    fetchErr: fetchPaymentMethodsErr,
    paymentMethods,
    fetchPaymentMethods,
  } = usePaymentMethodStore();
  const { createOrder } = useUserOrderStore();

  const [selectedAddress, setSelectedAddress] = useState<
    UserAddressResponse | undefined
  >(undefined);
  const [modalState, setModalState] = useState<ModalState>({
    addAddress: false,
    changeAddress: false,
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    PaymentMethodResponse | undefined
  >(undefined);

  const [applyUserBalance, setApplyUserBalance] = useState<boolean>(false);

  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);

  // Fetch initial when first loaded: cart, payment methods (set)
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      if (!user) return;

      // Fetch cart
      await fetchCart();

      // Fetch and set payment methods
      const methods = await fetchPaymentMethods();
      setSelectedPaymentMethod(methods?.methods[0]);
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
        const updatedSelectedAddress = addresses.addresses.find(
          (addr) => addr.id === selectedAddress.id
        );
        setSelectedAddress(updatedSelectedAddress);
        return;
      }

      // If no address is selected (e.g., on initial load), set the default one.
      if (!selectedAddress) {
        const defaultAddress = await getDefaultAddress();
        setSelectedAddress(defaultAddress);
      }
    };

    handleSetDefaultAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const genItemsList = useCallback(
    (cart: UserCartListResponse): JSX.Element | null => {
      return (
        <ul className="list-group list-group-flush">
          {cart.items.map((item) => (
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
    setModalState({
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

    if (!selectedPaymentMethod || !selectedAddress || !cart) {
      toast.error(
        !selectedPaymentMethod
          ? "Please select a payment method."
          : !selectedAddress
          ? "Please select a delivery address."
          : "Cart is empty or not available."
      );
      return;
    }

    setIsCreatingOrder(true);

    const order: OrderCreate = {
      userAddressId: selectedAddress.id,
      paymentMethodId: selectedPaymentMethod.id,
      applyUserBalance,
      items: cart.items.map((item) => ({
        variationId: item.variation.id,
        quantity: item.quantity,
      })),
    };

    try {
      const newOrder = await createOrder(order);

      if (applyUserBalance) resetUserBalance();

      if (selectedPaymentMethod.name === "cash") {
        toast.success("Successfully ordering!");
        navigate(`/account/orders`);
        clearCart();
        return;
      }

      if (selectedPaymentMethod.name === "stripe") {
        const res = await post(
          `${ORDER_URL}/${newOrder.id}/create-checkout-session`
        );
        if (!res.success) throw new Error(res.message);

        const data = res.data as CheckoutSessionResponse;
        if (!data.url) {
          throw new Error("Could not create Stripe checkout session.");
        }

        // Redirect to Stripe checkout session
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsCreatingOrder(false);
    }
  }, [
    applyUserBalance,
    cart,
    clearCart,
    createOrder,
    navigate,
    resetUserBalance,
    selectedAddress,
    selectedPaymentMethod,
  ]);

  return (
    <>
      <main className="container--g">
        <h1 className="mb-4 text-center">Checkout</h1>

        {!user ? (
          <ApiError errMsg="User data is not available." />
        ) : isGettingAddress || isFetchingCart || isFetchingPaymentMethods ? (
          <CheckoutSkeleton />
        ) : fetchAddressErr ||
          fetchCartErr ||
          !cart ||
          fetchPaymentMethodsErr ||
          !paymentMethods ||
          !selectedPaymentMethod ? (
          <ApiError
            errMsg={
              fetchAddressErr ||
              fetchCartErr ||
              (fetchPaymentMethodsErr
                ? "Payment methods data is not available."
                : "Cart or address data is not available.")
            }
          />
        ) : !cart.total || !isAllItemAvailable ? (
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
                          setModalState((prev) => ({
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
                          setModalState((prev) => ({
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
                  <button
                    type="button"
                    className="btn-premium--g w-100"
                    disabled={isCreatingOrder}
                    onClick={handleCheckout}
                  >
                    {selectedPaymentMethod.name === "cash" ? (
                      isCreatingOrder ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            aria-hidden="true"
                          ></span>
                          <output>Processing order...</output>
                        </>
                      ) : (
                        "Submit & Order"
                      )
                    ) : (
                      selectedPaymentMethod.name === "stripe" && (
                        <>
                          {isCreatingOrder ? (
                            <>
                              <SmallSpinner />{" "}
                            </>
                          ) : (
                            <FontAwesomeIcon
                              icon={faCcStripe}
                              className="me-2"
                            />
                          )}
                          Continue with Stripe
                        </>
                      )
                    )}
                  </button>
                </div>
                {/* Checkout items */}
                {genItemsList(cart)}
                <div className="card-footer bg-white text-center">
                  <Link to="/cart">Edit Cart</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateAddressModal
        isFirstAddress={!addresses || addresses.total === 0}
        show={modalState.addAddress}
        onHide={closeModal}
        onSuccess={handleSelectAddress}
      />
      <SelectAddressModal
        currentAddressId={selectedAddress?.id}
        show={modalState.changeAddress}
        onHide={closeModal}
        onSelect={handleSelectAddress}
      />
    </>
  );
}
