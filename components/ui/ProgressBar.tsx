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
    variant === "success"
      ? "bg-[var(--brand-success)]"
      : "bg-[var(--brand-ink)]";

  return (
    <div
      className={`
        h-2
        w-full
        overflow-hidden
        rounded-full
        bg-[var(--brand-bg)]
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
