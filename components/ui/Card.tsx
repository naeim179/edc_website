import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-[var(--brand-border)]
        bg-[var(--brand-surface)]
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-lg
        hover:border-[var(--brand-ink)]/30
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
