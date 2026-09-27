import type { ReactNode } from "react";

type CardContentProps = {
  children: ReactNode;
  className?: string;
};

export default function CardContent({
  children,
  className = "",
}: CardContentProps) {
  return (
    <div
      className={`
        px-5
        py-4
        ${className}
      `}
    >
      {children}
    </div>
  );
}
