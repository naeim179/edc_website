import type { ReactNode } from "react";

type CardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export default function CardHeader({
  children,
  className = "",
}: CardHeaderProps) {
  return (
    <div
      className={`
        px-5
        pt-5
        ${className}
      `}
    >
      {children}
    </div>
  );
}
