import { useRef } from "react";

export default function BankAndCard() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("BankAndCard render count:", renderCount.current);

  return (
    <div>
      <h1 className="h3 card-title">My Banks & Cards</h1>
      <p className="text-muted mb-4">Manage your saved banks and cards here.</p>
      <div className="text-center py-5 border rounded">
        <p>Coming soon...</p>
      </div>
    </div>
  );
}