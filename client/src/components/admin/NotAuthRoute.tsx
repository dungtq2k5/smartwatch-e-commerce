import { memo, useRef } from "react";
import { useAuthStore } from "../../store/admin/authStore";
import { Navigate, Outlet } from "react-router-dom";

const NotAuthRoute = memo(() => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("NotAuthRoute admin rendered", renderCount.current);

  const { admin } = useAuthStore();

  // If admin is authenticated -> redirect to admin dashboard
  if (admin) {
    return <Navigate to="/admin" replace />;
  }

  // Otherwise -> render the outlet (admin login, etc.)
  return <Outlet />;
});

export default NotAuthRoute;