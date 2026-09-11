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
    <div
      className="bg-white rounded-[26px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      dir="rtl"
    >

      {image ? (
        <img
          src={image}
          alt={title}
          className="w-full h-52 object-cover"
        />
      ) : (
        <div className="w-full h-52 bg-slate-100 flex items-center justify-center text-sm text-slate-400">
          لا توجد صورة
        </div>
      )}


      <div className="p-5 space-y-4">


        {category && (
          <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-[#124b8a] text-xs font-bold">
            {category}
          </span>
        )}


        <h3 className="text-xl font-bold text-slate-800 leading-8">
          {title}
        </h3>


        <div className="flex items-center justify-between text-sm">

          <span className="font-bold text-[#124b8a]">
            {progress}%
          </span>

          <span className="text-slate-500">
            {completedLessons} من {totalLessons} درس مكتمل
          </span>

        </div>


        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">

          <div
            className="h-full bg-[#124b8a] rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>


        <Link
          href={`/courses/${id}`}
          className="block text-center bg-[#124b8a] hover:bg-[#0d3b6e] text-white py-3 rounded-xl font-bold transition"
        >
          متابعة التعلم
        </Link>


      </div>

    </div>
  );
}
