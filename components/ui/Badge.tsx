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
    "bg-[#F0EBE1] text-[#6B6155]",

  success:
    "bg-emerald-50 text-emerald-700",

  danger:
    "bg-red-50 text-red-700",

  warning:
    "bg-amber-50 text-amber-700",

  info:
    "bg-[#F7F3EC] text-[#1B4B43]",
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
