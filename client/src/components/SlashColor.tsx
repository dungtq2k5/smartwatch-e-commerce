type SlashColorProps = {
  hexColor: string;
  size?: "small" | "medium" | "big";
  className?: string;
};

export default function SlashColor({
  hexColor,
  size = "medium",
  className = undefined,
}: Readonly<SlashColorProps>) {
  const sizeMap = {
    small: "1rem",
    medium: "1.5rem",
    big: "2rem",
  };

  return (
    <span
      className={"slash-color" + (className ? " " + className : "")}
      style={
        {
          "--hex-color": hexColor,
          fontSize: sizeMap[size],
        } as React.CSSProperties
      }
    >
      /
    </span>
  );
}
