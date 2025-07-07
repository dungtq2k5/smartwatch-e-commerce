import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { memo, useRef } from "react";

const AuthRoute = memo(function AuthRoute() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("AuthRoute rendered", renderCount.current);

  const { user, isAuth } = useAuthStore();

  // User not exists -> tell them to login
  if (!user) {
    return (
      <main>
        <h1>
          Please <Link to="/login">Login</Link> to view this page
        </h1>
      </main>
    );
  }

  // User exists but not authenticated -> redirect to verify page
  if (!isAuth) {
    return <Navigate to="/verify" replace />;
  }

  // User exists and authenticated -> allow access to the page
  return <Outlet />;
});

export default AuthRoute;
