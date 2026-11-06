import Image from "next/image";
import { BookIcon } from "@/components/icons";

const PALETTES = [
  { background: "#e2ece4", color: "#315e4c" },
  { background: "#f0e5d5", color: "#82603b" },
  { background: "#e0e8ec", color: "#3f6072" },
  { background: "#eae4ed", color: "#6d5779" },
];

type Props = { image?: string | null; title: string; compact?: boolean; showTitle?: boolean };

export default function CourseCover({ image, title, compact = false, showTitle = true }: Props) {
  if (image) return <div className="relative h-full w-full overflow-hidden"><Image src={image} alt="" fill sizes={compact ? "80px" : "(max-width: 768px) 100vw, 400px"} className="object-cover" /></div>;
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const palette = PALETTES[hash % PALETTES.length];
  return <div className={`yw-course-cover ${compact ? "yw-course-cover-compact" : ""}`} style={{ backgroundColor: palette.background, color: palette.color }}>
    <div className="yw-cover-lines" aria-hidden="true" />
    {compact ? <span aria-hidden="true" className="text-2xl font-bold">{Array.from(title.trim())[0] || <BookIcon width={24} height={24} />}</span> : <><BookIcon width={60} height={60} strokeWidth={1.2} className="relative shrink-0" />{showTitle && <p className="relative line-clamp-3 text-xl font-bold leading-snug">{title}</p>}<span className="yw-cover-brand" aria-hidden="true">YOUR WAY · LEARNING</span></>}
  </div>;
}
