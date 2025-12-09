import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";

const InvalidMsg = memo(
  ({ msg, className }: { msg?: string | string[] | null; className?: string }) => {
    return (
      <div className={`text-danger small mt-1 ${className || ""}`}>
        <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
        {Array.isArray(msg) ? msg.join(", ") : msg || "Invalid input"}
      </div>
    );
  }
);

export default InvalidMsg;
