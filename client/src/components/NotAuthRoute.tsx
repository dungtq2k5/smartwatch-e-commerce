import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { memo, useRef } from "react";

const NotAuthRoute = memo(() => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("NotAuthRoute rendered", renderCount.current);

  const { user, isAuth } = useAuthStore();
  const location = useLocation();

  // If user is authenticated, redirect to home page
  if (user && isAuth) {
    return <Navigate to="/" replace />;
  }

  // If user is not registered and tries to access /verify, redirect to login page
  if (!user && location.pathname === "/verify") {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the outlet (login, signup, etc.)
  return <Outlet />;
});

export default NotAuthRoute;
