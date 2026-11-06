import type { HTMLAttributes } from "react";

export default function Card({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`yw-card rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] ${className}`} {...props}>{children}</div>;
}
