import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { memo, useRef } from "react";

const Header = memo(function Header() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Header rendered", renderCount.current);

  return (
    <header className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
      <div className="container-fluid">
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
          <form className="d-flex">
            <label htmlFor="search" hidden aria-hidden="true">Search</label>
            <input
              className="form-control me-1"
              type="search"
              id="search"
              name="search"
              placeholder="Search"
              aria-label="Search"
            />
            <button className="btn p-0" type="submit">
              <Search size={20} />
            </button>
          </form>
          <div className="d-flex align-items-center ms-lg-3 mt-2 mt-lg-0">
            <Link to="/login" className="btn btn-outline-primary me-2">
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary">
              Signup
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;
