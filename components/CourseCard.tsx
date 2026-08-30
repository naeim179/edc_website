'use client';

import Link from "next/link";

interface CourseCardProps {
  id: number;
  title: string;
  category: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  image: string;
}

export default function CourseCard({
  id,
  title,
  category,
  progress,
  completedLessons,
  totalLessons,
  image,
}: CourseCardProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
      <img
        src={image}
        alt={title}
        className="w-20 h-20 rounded-xl object-cover shrink-0"
      />

      <div className="flex-1 text-right space-y-1">
        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
          {category}
        </span>

        <h4 className="text-sm font-bold text-slate-800">
          {title}
        </h4>

        <p className="text-xs text-slate-400">
          {completedLessons} من {totalLessons} درس
        </p>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-[#087a54] h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-end justify-between h-full py-1 shrink-0">
        <span className="text-xs font-bold text-slate-500">
          مكتمل {progress}%
        </span>

        <Link
          href={`/courses/${id}`}
          className="px-3 py-1.5 text-xs font-bold text-[#087a54] border border-[#087a54]/30 rounded-lg hover:bg-[#087a54] hover:text-white transition-all"
        >
          عرض الدورة
        </Link>
      </div>
    </div>
  );
}
