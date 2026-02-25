export default function Loading({
  loadingMsg,
  className = "",
}: Readonly<{ loadingMsg?: string; className?: string }>) {
  // DEV temp for testing
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("Loading rendered", renderCount.current);

  return (
    <div
      className={`d-flex justify-content-center align-items-center h-100 w-100 ${className}`}
    >
      <div className="spinner-border text-primary spinner-sm">
        <span className="visually-hidden">Loading...</span>
      </div>
      <output className="ms-2 fs-6">
        {loadingMsg
          ? loadingMsg.endsWith("...")
            ? loadingMsg
            : `${loadingMsg}...`
          : "Loading..."}
      </output>
    </div>
  );
}
