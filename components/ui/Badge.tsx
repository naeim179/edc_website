import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "danger"
  | "warning"
  | "info";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variants = {
  default:
    "bg-[var(--brand-bg)] text-[var(--brand-text-muted)]",

  success:
    "bg-[var(--brand-success-bg)] text-[var(--brand-success)]",

  danger:
    "bg-[var(--brand-danger-bg)] text-[var(--brand-danger)]",

  warning:
    "bg-[var(--brand-warning-bg)] text-[var(--brand-warning)]",

  info:
    "bg-[var(--brand-surface)] text-[var(--brand-ink)]",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-3
        py-1
        text-xs
        font-semibold
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
