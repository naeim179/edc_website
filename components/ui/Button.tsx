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
    "bg-[#08744f] text-white hover:bg-[#065c3e] shadow-sm hover:shadow-md",

  secondary:
    "bg-slate-100 text-slate-800 hover:bg-slate-200",

  danger:
    "bg-red-600 text-white hover:bg-red-700",

  warning:
    "bg-[#c9704a] text-white hover:bg-[#b15f3b]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

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
