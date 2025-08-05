export default function Loading({
  loadingMsg,
}: Readonly<{ loadingMsg?: string }>) {
  // DEV temp for testing
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("Loading rendered", renderCount.current);

  return (
    <div className="d-flex justify-content-center align-items-center h-100 w-100">
      <div className="spinner-border text-primary">
        <span className="visually-hidden">Loading...</span>
      </div>
      <output className="ms-3 fs-5">
        {loadingMsg
          ? loadingMsg.endsWith("...")
            ? loadingMsg
            : `${loadingMsg}...`
          : "Loading..."}
      </output>
    </div>
  );
}
