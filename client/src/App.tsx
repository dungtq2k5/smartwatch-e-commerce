import { Routes, Route } from "react-router-dom";
import { useAuthStore } from "./store/authStore.ts";
import Home from "./pages/Home.tsx";
import NotAuthRoute from "./components/NotAuthRoute.tsx";
import AuthRoute from "./components/AuthRoute.tsx";
import Header from "./components/Header.tsx";
import Footer from "./components/Footer.tsx";
import Signup from "./pages/Signup.tsx";
import Login from "./pages/Login.tsx";
import Verify from "./pages/Verify.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import Account from "./pages/Account.tsx";
import Profile from "./components/account/Profile.tsx";
import Address from "./components/account/Address.tsx";
import BankAndCard from "./components/account/BankAndCard.tsx";
import Loading from "./components/Loading.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import SearchProduct from "./pages/SearchProduct.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";
import OrderStatus from "./pages/OrderStatus.tsx";
import Purchase from "./components/account/Purchase.tsx";
import PurchaseDetail from "./components/account/PurchaseDetail.tsx";
import ReturnRefund from "./pages/ReturnRefundCreate.tsx";
import ReturnRefundDetail from "./pages/ReturnRefundDetail.tsx";
import ReturnRefundUpdate from "./pages/ReturnRefundUpdate.tsx";

export default function App() {
  // DEV for testing
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("App render count:", renderCount.current);

  const { checkAuth } = useAuthStore();
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const handleCheckAuth = async (): Promise<void> => {
      setIsCheckingAuth(true);
      await checkAuth();
      setIsCheckingAuth(false);
    };

    handleCheckAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isCheckingAuth ? (
    <main className="container--g container--center--g">
      <Loading loadingMsg="Checking authentication status..." />
    </main>
  ) : (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />}></Route>
        <Route path="/search" element={<SearchProduct />}></Route>
        <Route path="/products/:id" element={<ProductDetail />}></Route>

        <Route element={<NotAuthRoute />}>
          <Route path="/signup" element={<Signup />}></Route>
          <Route path="/login" element={<Login />}></Route>
          <Route path="/verify" element={<Verify />}></Route>
          <Route path="/forgot-password" element={<ForgotPassword />}></Route>
          <Route
            path="/reset-password/:token"
            element={<ResetPassword />}
          ></Route>
        </Route>

        <Route element={<AuthRoute />}>
          {/*
            TODO
            - user purchase(checkout) page.
            - user balance page: display balance, transaction history, transfer to bank card.
            - user bank card page: add, remove, update bank card.
          */}
          <Route path="/account" element={<Account />}>
            <Route index element={<Profile />}></Route>
            <Route path="profile" element={<Profile />}></Route>
            <Route path="bank-card" element={<BankAndCard />}></Route>
            <Route path="address" element={<Address />}></Route>

            <Route path="purchase">
              <Route index element={<Purchase />}></Route>
              <Route path="order/:id" element={<PurchaseDetail />}></Route>
              <Route
                path="order/:id/return-refund/:returnId"
                element={<ReturnRefundDetail />}
              ></Route>
            </Route>

          </Route>

          <Route path="/cart" element={<Cart />}></Route>
          <Route path="/checkout" element={<Checkout />}></Route>
          <Route path="/order-status" element={<OrderStatus />}></Route>

          <Route path="/return-refund">
            <Route path="create/:orderId" element={<ReturnRefund />}></Route>
            <Route
              path="update/:orderId/:returnId"
              element={<ReturnRefundUpdate />}
            ></Route>
          </Route>

        </Route>

        <Route path="*" element={<NotFound />}></Route>
      </Routes>

      <Footer />

      <Toaster
        toastOptions={{
          style: { minWidth: "max-content" },
        }}
      />
    </>
  );
}
