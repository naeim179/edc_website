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
        p-5
        md:p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
