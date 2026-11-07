import Image from "next/image";

type Props = {
  variant?: "compact" | "navigation" | "auth";
  priority?: boolean;
};

export default function BrandLogo({ variant = "navigation", priority = false }: Props) {
  const size = variant === "auth" ? 150 : variant === "compact" ? 44 : 80;
  return <span className={`yw-brand-logo yw-brand-logo-${variant}`}><Image src="/logo/logo-transparent.png" alt="Your Way Academy" width={size} height={size} priority={priority} className="h-full w-full object-contain" /></span>;
}
