import {
  faBars,
  faGauge,
  faRotateRight,
  faUser,
  faBox,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo, useCallback, useRef, useState } from "react";
import { PROJECT_NAME } from "../../../../common/configs.common";
import { Link, NavLink, Outlet } from "react-router-dom";
import defaultAvatar from "../../assets/default-avatar.webp";
import useAuthStore from "../../store/admin/authStore";
import useHasPermission from "../../hooks/admin/useHasPermission";
import useRefreshStore from "../../store/admin/refreshStore";

const HeaderAndSidebar = memo(() => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Admin header rendered", renderCount.current);

  const { admin } = useAuthStore();
  const refresh = useRefreshStore((state) => state.refresh);

  const [
    canReadUser,
    canReadProduct,
    canReadModel,
    canReadVariation,
    canReadInstance,
    canReadGrn,
    canReadProductBrand,
    canReadCategory,
    canReadOs,
    canReadProvider,
    canReadRole,
  ] = [
    useHasPermission("r_usr"),
    useHasPermission("r_product"),
    useHasPermission("r_product_model"),
    useHasPermission("r_model_variation"),
    useHasPermission("r_variation_instance"),
    useHasPermission("r_grn"),
    useHasPermission("r_product_brand"),
    useHasPermission("r_product_cat"),
    useHasPermission("r_product_os"),
    useHasPermission("r_provider_inventory"),
    useHasPermission("r_usr_role"),
  ];
  
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  const toggleSidebar = useCallback((): void => {
    setIsSidebarOpen(!isSidebarOpen);
  }, [isSidebarOpen]);

  return (
    <>
      {/* Header */}
      <header className="admin-header--g shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <button
            type="button"
            aria-label="Toggle navigation"
            className="btn"
            title="Toggle menu"
            onClick={toggleSidebar}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
          <Link to="/admin" className="navbar-brand fw-bold">
            {PROJECT_NAME} Admin
          </Link>
        </div>

        <div className="d-flex align-items-center gap-3">
          <button
            title="Refresh data"
            onClick={() => refresh("admin")}
            className="btn"
          >
            <FontAwesomeIcon icon={faRotateRight} />
          </button>

          <div>
            <Link
              to="#"
              className="d-flex align-items-center text-decoration-none text-black"
            >
              <img
                src={admin?.avatarUrl || defaultAvatar}
                className="avatar--g avatar--sm--g me-2"
                alt="account avatar"
                loading="lazy"
              />
              <p className="mb-0">{admin?.fullName || "N/A"}</p>
            </Link>
          </div>
        </div>
      </header>

      {/* Sidebar and main content outlet */}
      <div className="d-flex flex-grow-1">
        <nav
          className={`admin-sidebar--g shadow-sm ${
            isSidebarOpen ? "open" : "closed"
          }`}
        >
          <div className="list-group list-group-flush">
            <NavLink
              to="/admin"
              end
              className="list-group-item list-group-item-action"
            >
              <FontAwesomeIcon icon={faGauge} className="me-2" />
              Dashboard
            </NavLink>
            {canReadUser && (
              <NavLink
                to="/admin/users"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faUser} className="me-2" />
                User
              </NavLink>
            )}
            {canReadProduct && (
              <NavLink
                to="/admin/products"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Product
              </NavLink>
            )}
            {canReadProductBrand && (
              <NavLink
                to="/admin/product-brands"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Brand
              </NavLink>
            )}
            {canReadCategory && (
              <NavLink
                to="/admin/product-categories"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Category
              </NavLink>
            )}
            {canReadOs && (
              <NavLink
                to="/admin/product-oses"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                OS
              </NavLink>
            )}
            {canReadModel && (
              <NavLink
                to="/admin/product-models"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Model
              </NavLink>
            )}
            {canReadVariation && (
              <NavLink
                to="/admin/model-variations"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Variation
              </NavLink>
            )}
            {canReadInstance && (
              <NavLink
                to="/admin/variation-instances"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Instance
              </NavLink>
            )}
            {canReadGrn && (
              <NavLink
                to="/admin/grns"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                GRN
              </NavLink>
            )}
            {canReadProvider && (
              <NavLink
                to="/admin/providers"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faBox} className="me-2" />
                Provider
              </NavLink>
            )}
            {canReadRole && (
              <NavLink
                to="/admin/roles"
                className="list-group-item list-group-item-action"
              >
                <FontAwesomeIcon icon={faUserShield} className="me-2" />
                Role
              </NavLink>
            )}
          </div>
        </nav>

        <main className="admin-main-content--g">
          <Outlet />
        </main>
      </div>
    </>
  );
});

export default HeaderAndSidebar;
