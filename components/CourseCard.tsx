"use client";

import Link from "next/link";

interface CourseCardProps {
  id: string | number;
  title: string;
  category?: string | null;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  image?: string | null;
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">

      <div className="flex items-center gap-5 p-5">

        {image ? (
          <img
            src={image}
            alt={title}
            className="w-28 h-28 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <div className="w-28 h-28 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-400 shrink-0">
            لا توجد صورة
          </div>
        )}


        <div className="flex-1 text-right space-y-2">

          {category && (
            <span className="inline-block text-xs font-bold text-[#124b8a] bg-blue-50 px-3 py-1 rounded-full">
              {category}
            </span>
          )}


          <h3 className="text-lg font-bold text-slate-800">
            {title}
          </h3>


          <p className="text-sm text-slate-500">
            {completedLessons} من {totalLessons} درس مكتمل
          </p>


          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#124b8a] h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>


        </div>


        <div className="flex flex-col items-end justify-between h-28 shrink-0">

          <span className="text-sm font-bold text-slate-500">
            {progress}%
          </span>


          <Link
            href={`/courses/${id}`}
            className="px-4 py-2 text-sm font-bold text-white bg-[#124b8a] hover:bg-[#0d3b6e] rounded-xl transition"
          >
            عرض الدورة
          </Link>

        </div>


      </div>

    </div>
  );
}
