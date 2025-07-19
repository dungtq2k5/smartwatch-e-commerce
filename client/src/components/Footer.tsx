import { memo, useRef } from "react";

const Footer = memo(() => {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Footer rendered", renderCount.current);

  return (
    <footer className="bg-dark text-white text-center p-3 mt-auto">
      <div>
        <p className="mb-0">&copy; 2025 SmartWatch. All rights reserved.</p>
      </div>
    </footer>
  );
});

export default Footer;
