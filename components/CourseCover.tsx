import { BookIcon } from "@/components/icons";

const GRADIENTS = [
  "from-[#1B4B43] to-[#0F332D]",
  "from-[#8A3F2A] to-[#5C2A1C]",
  "from-[#2F5233] to-[#1B3820]",
  "from-[#3F5B6B] to-[#213443]",
];

function pickGradient(seed: string) {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return GRADIENTS[hash % GRADIENTS.length];
}

type Props = {
  image?: string | null;
  title: string;
};

/** صورة الدورة، أو غلاف مصمم بعنوان بارز إذا ما في صورة */
export default function CourseCover({ image, title }: Props) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full items-center overflow-hidden bg-gradient-to-br ${pickGradient(
        title
      )} px-6`}
    >
      <div
        aria-hidden="true"
        className="absolute -bottom-10 -end-10 h-40 w-40 rotate-45 bg-white/[0.06]"
      />

      <div
        aria-hidden="true"
        className="absolute -top-12 -start-8 h-28 w-28 rotate-45 bg-white/[0.05]"
      />

      <BookIcon
        width={20}
        height={20}
        strokeWidth={1.6}
        className="absolute end-4 top-4 text-white/40"
      />

      <p className="relative line-clamp-3 text-xl font-bold leading-snug text-white">
        {title}
      </p>
    </div>
  );
}
