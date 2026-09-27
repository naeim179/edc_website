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
        rounded-2xl
        border border-[#E8E1D4]
        bg-white
        transition-colors
        duration-300
        hover:border-[#1B4B43]/30
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
