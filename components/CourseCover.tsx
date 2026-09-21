import { BookIcon } from "@/components/icons";

const GRADIENTS = [
  "from-[#124b8a] to-[#0b3260]",
  "from-[#0f766e] to-[#0b4f4a]",
  "from-[#4338ca] to-[#312e81]",
  "from-[#1d4ed8] to-[#1e3a8a]",
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

/** صورة الدورة، أو غلاف متدرج أنيق إذا ما في صورة */
export default function CourseCover({ image, title }: Props) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${pickGradient(
        title
      )}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <BookIcon
        width={44}
        height={44}
        strokeWidth={1.4}
        className="relative text-white/85"
      />
    </div>
  );
}
