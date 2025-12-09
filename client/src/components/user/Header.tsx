import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { faCartShopping, faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
} from "react";
import useAuthStore from "../../store/user/authStore";
import defaultAvatar from "../../assets/default-avatar.webp";
import { formatError, removeOddSpaces } from "../../../../common/utils.common";
import useUserCartStore from "../../store/user/cartStore";
import toast from "react-hot-toast";

const Header = memo(() => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Header rendered", renderCount.current);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuth } = useAuthStore();
  const { fetchCart, cart } = useUserCartStore();

  const [isFetchingCart, setIsFetchingCart] = useState<boolean>(false);
  const [fetchCartErr, setFetchCartErr] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Handle searchTerm change by updating the URL
  useEffect(() => {
    if (location.pathname === "/search") {
      const urlSearchTerm = searchParams.get("searchTerm");
      if (urlSearchTerm) setSearchTerm(urlSearchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Handle fetching user cart if they are auth
  useEffect(() => {
    if (!isAuth) return;

    const handleFetchUserCart = async (): Promise<void> => {
      setIsFetchingCart(true);
      setFetchCartErr(null);

      try {
        await fetchCart();
      } catch (error) {
        setFetchCartErr(formatError(error));
        toast.error(formatError(error));
      } finally {
        setIsFetchingCart(false);
      }
    };

    handleFetchUserCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth]);

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const optimizedSearchTerm = removeOddSpaces(searchTerm);
      if (!optimizedSearchTerm) return;

      setSearchParams((prev) => {
        prev.set("searchTerm", optimizedSearchTerm);
        return prev;
      });

      navigate(`/search?${searchParams.toString()}`);
    },
    [navigate, searchParams, searchTerm, setSearchParams]
  );

  const renderBtns = (): JSX.Element => {
    if (user && isAuth) {
      return (
        <>
          {!isFetchingCart && !fetchCartErr && cart && (
            <Link to="/cart" title="my cart" className="position-relative">
              <FontAwesomeIcon
                icon={faCartShopping}
                className="fs-5 text-primary"
              />
              {cart.total > 0 && (
                <span className="cart-badge--g">{cart.total}</span>
              )}
            </Link>
          )}
          <Link to="/account/profile" title="my account">
            <img
              src={user.avatarUrl ?? defaultAvatar}
              className="avatar--g avatar--sm--g"
              alt="account"
              loading="lazy"
            />
          </Link>
        </>
      );
    }

    if (!isAuth) {
      return (
        <>
          <Link to="/login" className="btn btn-outline-primary">
            Login
          </Link>
          <Link to="/signup" className="btn btn-primary">
            Signup
          </Link>
        </>
      );
    }

    return (
      <Link to="/verify" className="btn btn-outline-primary">
        Verify my account
      </Link>
    );
  };

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
      <div className="container-fluid">
        {/* Logo */}
        <Link className="navbar-brand" to="/">
          SmartWatch
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          {/* Navigation links */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">
                About
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/contact">
                Contact
              </Link>
            </li>
          </ul>
          {/* Search bar */}
          <form className="d-flex me-4" onSubmit={handleSearch}>
            <label htmlFor="search" hidden aria-hidden="true">
              Search
            </label>
            <input
              className="form-control me-1"
              type="search"
              id="search"
              name="search"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search"
            />
            <button type="submit" className="btn p-0">
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </form>
          {/* User account or auth buttons */}
          <div className="d-flex align-items-end gap-3">{renderBtns()}</div>
        </div>
      </div>
    </header>
  );
});

export default Header;
