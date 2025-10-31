import { faFaceSadCry } from "@fortawesome/free-solid-svg-icons";
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
        icon={faFaceSadCry}
        size="2x"
        className="text-danger mb-3"
      />
      <p className="h3 mb-3">Oops! An error occurred.</p>
      <p className="lead text-muted">
        {errMsg ?? "Something went wrong on our end."}
      </p>
      <p>
        Please try refreshing the page, or contact support if the problem
        persists.
      </p>
      <button
        className="btn btn-primary mt-3"
        onClick={() => globalThis.location.reload()}
      >
        Refresh Page
      </button>
    </div>
  );
}
