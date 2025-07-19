import { memo } from "react";
import { Link } from "react-router-dom";

const NotFound = memo(() => {
  return (
    <main className="container--center--g">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-lg text-gray-600">
          The page you are looking for does not exist.{" "}
          <Link to="/">Go Back to homepage.</Link>
        </p>
      </div>
    </main>
  );
});

export default NotFound;
