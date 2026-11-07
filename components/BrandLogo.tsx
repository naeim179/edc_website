import Image from "next/image";

type Props = {
  variant?: "compact" | "navigation" | "auth";
  priority?: boolean;
  original?: boolean;
};

export default function BrandLogo({ variant = "navigation", priority = false, original = false }: Props) {
  const size = variant === "auth" ? 150 : variant === "compact" ? 44 : 80;
  return <span className={`yw-brand-logo yw-brand-logo-${variant}${original ? " yw-brand-logo-original" : ""}`}><Image src={original ? "/logo/logo.png" : "/logo/logo-transparent.png"} alt="Your Way Academy" width={size} height={size} priority={priority} className="h-full w-full object-contain" /></span>;
}
