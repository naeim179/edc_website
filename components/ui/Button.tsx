import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "warning";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
};

const variants = {
  primary:
    "bg-[var(--brand-ink)] text-[var(--brand-on-ink)] hover:bg-[var(--brand-ink-hover)]",

  secondary:
    "bg-[var(--brand-ink-soft)] text-[var(--brand-ink)] hover:opacity-80",

  danger:
    "bg-red-600 text-white hover:bg-red-700",

  warning:
    "bg-[#c9704a] text-white hover:bg-[#b15f3b]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

export default function Button({
  children,
  href,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
}: ButtonProps) {

  const styles =
    `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={styles}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={styles}
    >
      {children}
    </button>
  );
}
