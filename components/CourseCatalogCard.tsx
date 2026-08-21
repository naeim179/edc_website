import Link from "next/link";

interface CourseCatalogCardProps {
  id: number;
  title: string;
  instructor: string;
  category?: string;
  lessons: number;
  progress: number;
  image: string;
}

export default function CourseCatalogCard({
  id,
  title,
  instructor,
  category,
  lessons,
  progress,
  image,
}: CourseCatalogCardProps) {
  return (
    <Link
      href={`/courses/${id}`}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <img
        src={image}
        alt={title}
        className="w-full h-40 object-cover"
      />

      <div className="p-4 text-right space-y-2">
        {category && (
          <span className="inline-block text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
            {category}
          </span>
        )}

        <h3 className="text-sm font-bold text-slate-800">{title}</h3>

        <p className="text-xs text-slate-400">
          المدرب: {instructor}
        </p>

        <p className="text-xs text-slate-400">
          {lessons} درس
        </p>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-[#087a54] h-full rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}