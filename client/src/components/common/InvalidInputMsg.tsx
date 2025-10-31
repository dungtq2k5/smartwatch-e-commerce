import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";

const InvalidMsg = memo(
  ({ msg, className }: { msg: string | string[]; className?: string }) => {
    return (
      <div className={`text-danger small mt-1 ${className || ""}`}>
        <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
        {Array.isArray(msg) ? msg.join(", ") : msg}
      </div>
    );
  }
);

export default InvalidMsg;
