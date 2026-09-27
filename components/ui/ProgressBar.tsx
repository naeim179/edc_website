type ProgressBarProps = {
  value: number;
  variant?: "default" | "success";
  className?: string;
};

export default function ProgressBar({
  value,
  variant = "default",
  className = "",
}: ProgressBarProps) {
  const progress = Math.min(Math.max(value, 0), 100);

  const fillColor =
    variant === "success" ? "bg-emerald-500" : "bg-[#1B4B43]";

  return (
    <div
      className={`
        h-2
        w-full
        overflow-hidden
        rounded-full
        bg-[#F0EBE1]
        ${className}
      `}
    >
      <div
        className={`
          h-full
          rounded-full
          ${fillColor}
          transition-all
          duration-500
        `}
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
}
