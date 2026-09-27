import type { ReactNode } from "react";

type CardFooterProps = {
  children: ReactNode;
  className?: string;
};

export default function CardFooter({
  children,
  className = "",
}: CardFooterProps) {
  return (
    <div
      className={`
        px-5
        pb-5
        mt-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}
