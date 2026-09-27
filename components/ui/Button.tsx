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
};

const variants = {
  primary:
    "bg-[#1B4B43] text-white hover:bg-[#123A34]",

  secondary:
    "bg-[#F7F3EC] text-[#2A2420] hover:bg-[#F0EBE1]",

  danger:
    "bg-red-600 text-white hover:bg-red-700",

  warning:
    "bg-[#C9704A] text-white hover:bg-[#B15F3B]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors";

export default function Button({
  children,
  href,
  variant = "primary",
  className = "",
}: ButtonProps) {
  const styles = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={styles}>
        {children}
      </Link>
    );
  }

  return (
    <button className={styles}>
      {children}
    </button>
  );
}
