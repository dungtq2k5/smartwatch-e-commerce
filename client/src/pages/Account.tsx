import {
  faBox,
  faCreditCard,
  faLocationDot,
  faRightFromBracket,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import defaultAvatar from "../assets/default-avatar.webp";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useRef, useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import HorizontalDivider from "../components/HorizontalDivider";
import ApiError from "../components/ApiError";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../configs";
import { formatError } from "../../../common/utils.common";

export default function Account() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Account render count:", renderCount.current);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuthStore();

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    if (location.pathname === "/account") {
      navigate("/account/profile", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handleLogout = useCallback(async (): Promise<void> => {
    if (isLoggingOut) {
      toast("Logout is in progress. Please wait.", { icon: WAITING_EMOJI });
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout, navigate]);

  return (
    <>
      {!user ? (
        <ApiError errMsg="User data is not available." />
      ) : (
        <div className="container--g" style={{ minWidth: "100%" }}>
          <div className="row">
            {/* Left menu/sidebar */}
            <div className="col-md-3">
              <aside className="border rounded-3 shadow-sm p-4">
                <div className="d-flex align-items-center mb-4">
                  <img
                    src={user.avatarUrl || defaultAvatar}
                    alt="User Avatar"
                    className="avatar--g avatar--md--g me-3"
                  />
                  <div>
                    <h2 className="h5 mb-0 text-truncate">{user.fullName}</h2>
                    <small className="text-muted text-truncate">
                      {user.email || user.phoneNumber}
                    </small>
                  </div>
                </div>
                <nav className="nav flex-column nav-pills">
                  <NavLink to="/account/profile" className="nav-link">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    My Profile
                  </NavLink>
                  <NavLink to="/account/bank-card" className="nav-link">
                    <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                    Banks & Cards
                  </NavLink>
                  <NavLink to="/account/address" className="nav-link">
                    <FontAwesomeIcon icon={faLocationDot} className="me-2" />
                    My addresses
                  </NavLink>
                  <NavLink to="/account/purchase" className="nav-link">
                    <FontAwesomeIcon icon={faBox} className="me-2" />
                    My purchases
                  </NavLink>
                </nav>
                <div className="my-2">
                  <HorizontalDivider />
                </div>
                <button
                  type="button"
                  className="btn btn-link text-danger px-3"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="me-2" />
                  {isLoggingOut ? "Leaving..." : "Logout"}
                </button>
              </aside>
            </div>

            {/* Main content */}
            <div className="col-md-9">
              <main
                className="border rounded-3 shadow-sm p-4 h-100"
                style={{ maxWidth: "1200px" }}
              >
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
