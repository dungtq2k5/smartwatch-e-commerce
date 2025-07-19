import { faLandmark, faMapPin, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type {
  UserResponse,
} from "../../../common/types.common";
import defaultAvatar from "../assets/default-avatar.webp";
import { NavLink, Outlet } from "react-router-dom";
import { useRef } from "react";
import { useAuthStore } from "../store/authStore";

// TODO email change: component Change email(input) -> component verify email(input)
// Similar to phone number and password change.

export default function Account() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Account render count:", renderCount.current);

  const user = useAuthStore().user as UserResponse;

  return (
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
                <small className="text-muted text-truncate">{user.email}</small>
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
  );
}

