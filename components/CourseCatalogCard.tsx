import Link from "next/link";

interface CourseCatalogCardProps {
  id: string;
  title: string;
  instructor?: string;
  category?: string | null;
  lessons: number;
  progress: number;
  image?: string | null;
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
    <div className="group bg-white rounded-[26px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

      <Link href={`/courses/${id}`}>



      </Link>


      <div className="p-5 text-right space-y-4">

        {category && (
          <span className="inline-flex px-3 py-1 rounded-full bg-blue-50 text-[#124b8a] text-xs font-bold">
            {category}
          </span>
        )}


        <h3 className="text-lg font-bold text-slate-800 leading-7">
          {title}
        </h3>


        {instructor && (
          <p className="text-sm text-slate-500">
            المدرب: {instructor}
          </p>
        )}


        <div className="flex justify-end gap-2">

          <span className="text-xs font-bold bg-slate-50 border border-slate-100 text-slate-500 px-3 py-1.5 rounded-full">
            📚 {lessons} درس
          </span>

        </div>


        {progress > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold text-[#124b8a]">
                {progress}%
              </span>

              <span className="text-slate-400">
                التقدم
              </span>
            </div>

            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#124b8a] rounded-full"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}


        <Link
          href={`/courses/${id}`}
          className="block text-center bg-[#124b8a] hover:bg-[#0d3765] text-white py-3 rounded-xl font-bold transition"
        >
          عرض الدورة
        </Link>


      </div>

    </div>
  );
}
