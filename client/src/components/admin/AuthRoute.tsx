import { memo, useEffect, useRef, useState } from "react";
import useAuthStore from "../../store/admin/authStore";
import { Navigate, Outlet } from "react-router-dom";
import usePermissionStore from "../../store/admin/permissionStore";
import useRoleStore from "../../store/admin/roleStore";
import { formatError } from "../../../../common/utils.common";
import Loading from "../common/Loading";
import ApiError from "../common/ApiError";

const AuthRoute = memo(() => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("AuthRoute admin rendered", renderCount.current);

  const { admin } = useAuthStore();
  const { roles, fetchRoles } = useRoleStore();
  const { permissions, fetchPermissions } = usePermissionStore();

  const [isInitializing, setIsInitializing] = useState(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Re-fetch roles & permissions on page load if admin exists to use usePermission hook properly later on
  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      if (admin) {
        setIsInitializing(true);
        setApiErr(null);

        try {
          await Promise.all([
            roles ? Promise.resolve() : fetchRoles(),
            permissions ? Promise.resolve() : fetchPermissions(),
          ]);
        } catch (error) {
          setApiErr(formatError(error));
        } finally {
          setIsInitializing(false);
        }
      }
    };

    handleFetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  // Admin not exists -> not auth -> navigate to admin login page
  if (!admin) {
    return <Navigate to="login" replace />;
  }

  // Admin exists -> allow access to the page
  return (
    <>
      {isInitializing ? (
        <main className="container--g container--center--g">
          <Loading loadingMsg="Fetching user roles & permissions..." />
        </main>
      ) : apiErr ? (
        <main className="container--g container--center--g">
          <ApiError errMsg={apiErr} />
        </main>
      ) : (
        <Outlet />
      )}
    </>
  );
});

export default AuthRoute;
