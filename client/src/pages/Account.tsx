import {
  faLandmark,
  faMapPin,
  faRightFromBracket,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import defaultAvatar from "../assets/default-avatar.webp";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCallback, useRef } from "react";
import { useAuthStore } from "../store/authStore";
import HorizontalDivider from "../components/HorizontalDivider";
import ApiError from "../components/ApiError";
import toast from "react-hot-toast";
import { formatError } from "../utils/utils";

export default function Account() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Account render count:", renderCount.current);

  const { user, isDeleting, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [logout, navigate]);

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
                    <FontAwesomeIcon icon={faUser} /> My Profile
                  </NavLink>
                  <NavLink to="/account/bank-card" className="nav-link">
                    <FontAwesomeIcon icon={faLandmark} /> Banks & Cards
                  </NavLink>
                  <NavLink to="/account/address" className="nav-link">
                    <FontAwesomeIcon icon={faMapPin} /> Addresses
                  </NavLink>
                </nav>
                <div className="my-2">
                  <HorizontalDivider />
                </div>
                <button
                  type="button"
                  className="btn btn-link text-danger px-3"
                  onClick={handleLogout}
                  disabled={isDeleting}
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="me-2" />
                  {isDeleting ? "Leaving..." : "Logout"}
                </button>
              </aside>
            </div>

            {/* Main content */}
            <div className="col-md-9">
              <main className="border rounded-3 shadow-sm p-4 h-100">
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
