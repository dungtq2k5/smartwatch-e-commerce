import { faFaceFrown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef } from "react";

export default function ApiError({ errMsg }: Readonly<{ errMsg?: string }>) {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("ApiError rendered", renderCount.current);

  return (
    <div className="text-center">
      <FontAwesomeIcon
        icon={faFaceFrown}
        size="4x"
        className="text-danger mb-3"
      />
      <h1 className="h2 mb-3">Oops! An error occurred.</h1>
      <p className="lead text-muted">
        {errMsg ?? "Something went wrong on our end."}
      </p>
      <p>
        Please try refreshing the page, or contact support if the problem
        persists.
      </p>
      <button
        className="btn btn-primary mt-3"
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  );
}
