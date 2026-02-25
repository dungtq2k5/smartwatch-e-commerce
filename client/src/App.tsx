import { Routes, Route, useLocation } from "react-router-dom";
import useAuthStore from "./store/user/authStore.ts";
import useAdminAuthStore from "./store/admin/authStore.ts";
import Home from "./pages/user/Home.tsx";
import NotAuthRoute from "./components/user/NotAuthRoute.tsx";
import AuthRoute from "./components/user/AuthRoute.tsx";
import Header from "./components/user/Header.tsx";
import Footer from "./components/user/Footer.tsx";
import Signup from "./pages/user/Signup.tsx";
import Login from "./pages/user/Login.tsx";
import Verify from "./pages/user/Verify.tsx";
import ForgotPassword from "./pages/user/ForgotPassword.tsx";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import ResetPassword from "./pages/user/ResetPassword.tsx";
import NotFound from "./pages/user/NotFound.tsx";
import Account from "./pages/user/Account.tsx";
import Profile from "./components/user/account/Profile.tsx";
import Address from "./components/user/account/Address.tsx";
import BankAndCard from "./components/user/account/BankAndCard.tsx";
import Loading from "./components/common/Loading.tsx";
import ProductDetail from "./pages/user/ProductDetail.tsx";
import SearchProduct from "./pages/user/SearchProduct.tsx";
import Cart from "./pages/user/Cart.tsx";
import Checkout from "./pages/user/Checkout.tsx";
import OrderStatus from "./pages/user/OrderStatus.tsx";
import Purchase from "./components/user/account/Purchase.tsx";
import PurchaseDetail from "./components/user/purchase/PurchaseDetail.tsx";
import ReturnRefund from "./pages/user/CreateReturnRefund.tsx";
import ReturnRefundDetail from "./pages/user/ReturnRefundDetail.tsx";
import ReturnRefundUpdate from "./pages/user/UpdateReturnRefund.tsx";
import CreateUserPaymentMethod from "./pages/user/CreateUserPaymentMethod.tsx";
import Balance from "./components/user/account/Balance.tsx";

import AdminLogin from "./pages/admin/Login.tsx";
import AdminAuthRoute from "./components/admin/AuthRoute.tsx";
import AdminNotAuthRoute from "./components/admin/NotAuthRoute.tsx";
import AdminHeaderAndSidebar from "./components/admin/HeaderAndSidebar.tsx";
import AdminDashboard from "./components/admin/Dashboard.tsx";
import UserManagement from "./components/admin/user/UserManagement.tsx";
import CreateUser from "./components/admin/user/CreateUser.tsx";
import EditUser from "./components/admin/user/EditUser.tsx";
import DetailUser from "./components/admin/user/DetailUser.tsx";
import ProductManagement from "./components/admin/product/ProductManagement.tsx";
import DetailProduct from "./components/admin/product/DetailProduct.tsx";
import ModelManagement from "./components/admin/product/ModelManagement.tsx";
import { EditProduct } from "./components/admin/product/EditProduct.tsx";
import { EditModel } from "./components/admin/product/EditModel.tsx";
import VariationManagement from "./components/admin/product/VariationManagement.tsx";
import InstanceManagement from "./components/admin/product/InstanceManagement.tsx";
import CreateProduct from "./components/admin/product/CreateProduct.tsx";
import CreateModel from "./components/admin/product/CreateModel.tsx";
import CreateVariation from "./components/admin/product/CreateVariation.tsx";
import CreateGrn from "./components/admin/grn/CreateGrn.tsx";
import CreateInstance from "./components/admin/product/CreateInstance.tsx";
import EditVariation from "./components/admin/product/EditVariation.tsx";
import GrnManagement from "./components/admin/grn/GrnManagement.tsx";
import { TOAST_DURATION } from "./configs.tsx";
import EditGrn from "./components/admin/grn/EditGrn.tsx";
import DetailInstance from "./components/admin/product/DetailInstance.tsx";
import EditInstance from "./components/admin/product/EditInstance.tsx";
import DetailGrn from "./components/admin/grn/DetailGrn.tsx";
import BrandManagement from "./components/admin/product/BrandManagement.tsx";
import CreateBrand from "./components/admin/product/CreateBrand.tsx";
import EditBrand from "./components/admin/product/EditBrand.tsx";
import DetailBrand from "./components/admin/product/DetailBrand.tsx";
import CategoryManagement from "./components/admin/product/CategoryManagement.tsx";
import CreateCategory from "./components/admin/product/CreateCategory.tsx";
import EditCategory from "./components/admin/product/EditCategory.tsx";
import DetailCategory from "./components/admin/product/DetailCategory.tsx";
import OsManagement from "./components/admin/product/OsManagement.tsx";
import CreateOs from "./components/admin/product/CreateOs.tsx";
import DetailOs from "./components/admin/product/DetailOs.tsx";
import EditOs from "./components/admin/product/EditOs.tsx";
import ProviderManagement from "./components/admin/grn/ProviderManagement.tsx";
import CreateProvider from "./components/admin/grn/CreateProvider.tsx";
import EditProvider from "./components/admin/grn/EditProvider.tsx";
import DetailProvider from "./components/admin/grn/DetailProvider.tsx";
import RoleManagement from "./components/admin/role/RoleManagement.tsx";
import CreateRole from "./components/admin/role/CreateRole.tsx";
import DetailRole from "./components/admin/role/DetailRole.tsx";
import EditRole from "./components/admin/role/EditRole.tsx";
import OrderManagement from "./components/admin/order/OrderManagement.tsx";

export default function App() {
  // DEV for testing
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("App render count:", renderCount.current);

  const location = useLocation();

  const isAdminPage = location.pathname.startsWith("/admin");

  const { checkAuth: checkAdminAuth } = useAdminAuthStore();
  const { checkAuth } = useAuthStore();

  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    const handleCheckAuth = async (): Promise<void> => {
      setIsCheckingAuth(true);

      if (isAdminPage) await checkAdminAuth();
      else await checkAuth();

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
      {isAdminPage ? (
        <Routes>
          <Route path="/admin">
            {/* TODO Admin features
              - dashboard
              - order management
              - return management
              - withdraw request management
            */}
            <Route element={<AdminNotAuthRoute />}>
              <Route path="login" element={<AdminLogin />} />
            </Route>

            <Route element={<AdminAuthRoute />}>
              <Route element={<AdminHeaderAndSidebar />}>
                <Route index element={<AdminDashboard />} />

                <Route path="users">
                  <Route index element={<UserManagement />} />
                  <Route path="create" element={<CreateUser />} />
                  <Route path=":id">
                    <Route index element={<DetailUser />} />
                    <Route path="edit" element={<EditUser />} />
                  </Route>
                </Route>

                <Route path="products">
                  <Route index element={<ProductManagement />} />
                  <Route path="create" element={<CreateProduct />} />
                  <Route path=":id">
                    <Route index element={<DetailProduct />} />
                    <Route path="edit" element={<EditProduct />} />
                  </Route>
                </Route>

                <Route path="product-brands">
                  <Route index element={<BrandManagement />} />
                  <Route path="create" element={<CreateBrand />} />
                  <Route path=":id">
                    <Route index element={<DetailBrand />} />
                    <Route path="edit" element={<EditBrand />} />
                  </Route>
                </Route>

                <Route path="product-categories">
                  <Route index element={<CategoryManagement />} />
                  <Route path="create" element={<CreateCategory />} />
                  <Route path=":id">
                    <Route index element={<DetailCategory />} />
                    <Route path="edit" element={<EditCategory />} />
                  </Route>
                </Route>

                <Route path="product-oses">
                  <Route index element={<OsManagement />} />
                  <Route path="create" element={<CreateOs />} />
                  <Route path=":id">
                    <Route index element={<DetailOs />} />
                    <Route path="edit" element={<EditOs />} />
                  </Route>
                </Route>

                <Route path="product-models">
                  <Route index element={<ModelManagement />} />
                  <Route path="create/:productId" element={<CreateModel />} />
                  <Route path=":id/edit" element={<EditModel />} />
                </Route>

                <Route path="model-variations">
                  <Route index element={<VariationManagement />} />
                  <Route path="create/:modelId" element={<CreateVariation />} />
                  <Route path=":id/edit" element={<EditVariation />} />
                </Route>

                <Route path="variation-instances">
                  <Route index element={<InstanceManagement />} />
                  <Route
                    path="create/:variationId"
                    element={<CreateInstance />}
                  />
                  <Route path=":id">
                    <Route index element={<DetailInstance />} />
                    <Route path="edit" element={<EditInstance />} />
                  </Route>
                </Route>

                <Route path="grns">
                  <Route index element={<GrnManagement />} />
                  <Route path="create/:variationId" element={<CreateGrn />} />
                  <Route path=":id">
                    <Route index element={<DetailGrn />} />
                    <Route path="edit" element={<EditGrn />} />
                  </Route>
                </Route>

                <Route path="providers">
                  <Route index element={<ProviderManagement />} />
                  <Route path="create" element={<CreateProvider />} />
                  <Route path=":id">
                    <Route index element={<DetailProvider />} />
                    <Route path="edit" element={<EditProvider />} />
                  </Route>
                </Route>

                <Route path="roles">
                  <Route index element={<RoleManagement />} />
                  <Route path="create" element={<CreateRole />} />
                  <Route path=":id">
                    <Route index element={<DetailRole />} />
                    <Route path="edit" element={<EditRole />} />
                  </Route>
                </Route>

                <Route path="orders">
                  <Route index element={<OrderManagement />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      ) : (
        <>
          <Header />

          <Routes>
            <Route path="/">
              <Route index element={<Home />} />
              <Route path="search" element={<SearchProduct />} />
              <Route path="products/:id" element={<ProductDetail />} />

              <Route element={<NotAuthRoute />}>
                <Route path="signup" element={<Signup />} />
                <Route path="login" element={<Login />} />
                <Route path="verify" element={<Verify />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route
                  path="reset-password/:token"
                  element={<ResetPassword />}
                />
              </Route>

              <Route element={<AuthRoute />}>
                <Route path="account" element={<Account />}>
                  <Route index element={<Profile />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="bank-card" element={<BankAndCard />} />
                  <Route path="address" element={<Address />} />
                  <Route path="balance" element={<Balance />} />

                  <Route path="purchase">
                    <Route index element={<Purchase />} />
                    <Route path="order/:id" element={<PurchaseDetail />} />
                    <Route
                      path="return-refund/:returnId"
                      element={<ReturnRefundDetail />}
                    />
                  </Route>
                </Route>

                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order-status" element={<OrderStatus />} />

                <Route path="return-refund">
                  <Route path="create/:orderId" element={<ReturnRefund />} />
                  <Route
                    path=":returnId/update"
                    element={<ReturnRefundUpdate />}
                  />
                </Route>

                <Route
                  path="payment/create"
                  element={<CreateUserPaymentMethod />}
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>

          <Footer />
        </>
      )}

      <Toaster
        toastOptions={{
          style: { minWidth: "max-content" },
          duration: TOAST_DURATION,
        }}
      />
    </>
  );
}
