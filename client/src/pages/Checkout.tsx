import { faLocation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuthStore } from "../store/authStore";
import ApiError from "../components/ApiError";
import { useUserAddressStore } from "../store/addressStore";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UserAddressResponse } from "../../../common/types.common";
import { centsToUSD, formatAddress } from "../../../common/utils.common";
import { useUserCartStore } from "../store/cartStore";
import { Link } from "react-router-dom";
import defaultProductImg from "../assets/default-product.png";
import SlashColor from "../components/SlashColor";
import HorizontalDivider from "../components/HorizontalDivider";

export default function Checkout() {
  // DEV temp for testing
  const count = useRef(0);
  count.current += 1;
  console.log("Checkout render count:", count.current);

  // TODO select address section, if user does't have any address -> popup add address button
  // TODO select payment method section, if user select pay by card -> popup add card button
  // TODO loading skeleton
  const { user } = useAuthStore();
  const {
    isGetting: isGettingAddress,
    getErr: getAddressErr,
    getDefaultAddress,
  } = useUserAddressStore();
  const {
    isFetching: isFetchingCart,
    fetchErr: fetchCartErr,
    cart,
    fetchCart,
  } = useUserCartStore();

  const [defaultAddress, setDefaultAddress] = useState<
    UserAddressResponse | undefined
  >(undefined);

  // Fetch initial when first loaded: user addresses
  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      if (!user) return;

      // Fetch address
      const defaultAddress = await getDefaultAddress();
      if (defaultAddress) setDefaultAddress(defaultAddress);

      // Fetch cart
      if (!cart) await fetchCart();
    };

    handleFetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO need to reuse this logic in Cart.tsx
  const calcTotalCents = useMemo((): number => {
    if (!cart) return 0;
    return cart.items.reduce((total, item) => {
      if (item.variation.stockQuantity > 0 && !item.stopSelling) {
        return total + item.totalCents;
      }
      return total;
    }, 0);
  }, [cart]);

  const isAllItemsAvailable = useMemo((): boolean => {
    if (!cart) return true;
    return cart.items.every(
      (item) => !item.stopSelling && item.variation.stockQuantity > 0
    );
  }, [cart]);

  return (
    <main className="container--g">
      <h1>Checkout</h1>
      {!user ? (
        <ApiError errMsg="User data is not available." />
      ) : isGettingAddress || isFetchingCart ? (
        <p>Loading...</p>
      ) : getAddressErr || !defaultAddress || fetchCartErr || !cart ? (
        <ApiError
          errMsg={
            getAddressErr || !defaultAddress
              ? "User don't have any default address."
              : fetchCartErr || "Cart data is not available."
          }
        />
      ) : !cart.total || isAllItemsAvailable ? ( // Also check if cart has unavailable items
        <p>
          You don't have any item to checkout, <Link to="/">shopping now</Link>
        </p>
      ) : (
        <div>
          {/* Delivery address section - on the left */}
          <div>
            <h2>
              <FontAwesomeIcon icon={faLocation} /> Delivery Address
            </h2>
            <div>
              <p>
                {defaultAddress.name} ({defaultAddress.phoneNumber})
              </p>
              <p>{formatAddress(defaultAddress)}</p>
              {defaultAddress.isDefault && "Default page"}
              <button type="button">Change address</button>
            </div>
          </div>

          {/* Products ordered section - on the right */}
          <div>
            <h2>Checkout Summary</h2>
            <div>
              <span>Subtotal</span>
              <span>{centsToUSD(calcTotalCents)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div>
              <span>Estimated Tax</span>
              <span>Free</span>
            </div>
            <HorizontalDivider />
            <div>
              <span>Estimated Total</span>
              <span>{centsToUSD(calcTotalCents)}</span>
            </div>
            {/* Checkout items */}
            <div>
              {cart.items.map((item) => (
                <div key={item.variation.id}>
                  <img
                    src={item.variation.imageUrls[0] || defaultProductImg}
                    alt=""
                  />
                  <div>
                    <p>
                      {item.variation.productModel.product.name} -{" "}
                      {item.variation.productModel.name}
                    </p>
                    <p>
                      <SlashColor
                        hexColor={item.variation.color.hex}
                        className="me-1"
                      />
                      {item.variation.color.name}
                    </p>
                    <p>
                      {centsToUSD(
                        item.variation.additionalPriceCents +
                          item.variation.productModel.priceCents
                      )}{" "}
                      USD
                    </p>
                    <p>Quantity: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/cart">Edit Cart</Link>
          </div>
        </div>
      )}
    </main>
  );
}
