import { Link, useLocation, useNavigate } from "react-router-dom";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo, useCallback, useEffect, useState, type JSX } from "react";
import { useAuthStore } from "../store/authStore";
import defaultAvatar from "../assets/default-avatar.webp";
import { removeOddSpaces } from "../../../common/utils.common";

const Header = memo(() => {
  // DEV temp for testing
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("Header rendered", renderCount.current);

  const { user, isAuth } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState<string>("");

  const location = useLocation();
  const navigate = useNavigate();

  // Handle searchTerm change by updating the URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlSearchTerm = urlParams.get("searchTerm");
    if (urlSearchTerm) setSearchTerm(urlSearchTerm);
  }, [location.search]);

  const handleSearch = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const urlParams = new URLSearchParams(location.search);
      urlParams.set("searchTerm", removeOddSpaces(searchTerm));

      const searchQuery = urlParams.toString();
      navigate(`/search?${searchQuery}`);
    },
    [location.search, navigate, searchTerm]
  );

  const renderBtns = (): JSX.Element => {
    if (user && isAuth) {
      return (
        <Link to="/account" title="my account">
          <img
            src={user.avatarUrl ?? defaultAvatar}
            className="avatar--g avatar--sm--g"
            alt="account"
            loading="lazy"
          />
        </Link>
      );
    }

    if (!isAuth) {
      return (
        <>
          <Link to="/login" className="btn btn-outline-primary me-2">
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
          <form className="d-flex" onSubmit={handleSearch}>
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
          <div className="d-flex align-items-center ms-lg-3 mt-2 mt-lg-0">
            {renderBtns()}
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;
