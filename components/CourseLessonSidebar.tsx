import Link from "next/link";

type LessonSidebarProps = {
  courseId: string;
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
    }[];
  }[];
  currentLessonId: string;
  completedLessonIds: string[];
};

export default function CourseLessonSidebar({
  courseId,
  sections,
  currentLessonId,
  completedLessonIds,
}: LessonSidebarProps) {

  const totalLessons =
    sections.reduce(
      (total, section) =>
        total + section.lessons.length,
      0
    );

  const completedCount =
    completedLessonIds.length;

  const progress =
    totalLessons > 0
      ? Math.round(
          (completedCount / totalLessons) * 100
        )
      : 0;


  return (
    <aside
      className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-5 h-fit lg:sticky lg:top-5"
      dir="rtl"
    >

      <h2 className="text-lg font-bold text-slate-800">
        محتوى الدورة
      </h2>


      <div className="mt-4 p-4 rounded-2xl bg-blue-50">

        <div className="flex justify-between items-center text-sm mb-2">

          <span className="font-bold text-[#124b8a]">
            {progress}%
          </span>

          <span className="text-slate-600">
            تقدمك
          </span>

        </div>


        <div className="w-full h-2 bg-white rounded-full overflow-hidden">

          <div
            className="h-full bg-[#124b8a] rounded-full transition-all"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>


        <p className="text-xs text-slate-500 mt-3">
          {completedCount} من {totalLessons} درس مكتمل
        </p>

      </div>


      <div className="mt-6 space-y-6">


        {sections.map((section) => (

          <div key={section.id}>


            <div className="flex justify-between items-center mb-3">

              <h3 className="font-bold text-sm text-slate-700">
                {section.title}
              </h3>

              <span className="text-xs text-slate-400">
                {section.lessons.length} دروس
              </span>

            </div>



            <div className="space-y-2">

              {section.lessons.map((lesson) => {

                const completed =
                  completedLessonIds.includes(
                    lesson.id
                  );

                const active =
                  currentLessonId === lesson.id;


                return (

                  <Link
                    key={lesson.id}
                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                    className={`
                      flex items-center justify-between
                      gap-3 px-3 py-3 rounded-xl
                      text-sm transition
                      ${
                        active
                          ? "bg-blue-50 text-[#124b8a] font-bold border border-blue-100"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }
                    `}
                  >

                    <span className="truncate">
                      {lesson.title}
                    </span>


                    <span className="shrink-0">
                      {
                        completed
                          ? "✅"
                          : active
                          ? "▶️"
                          : "○"
                      }
                    </span>


                  </Link>

                );

              })}

            </div>


          </div>

        ))}


      </div>


    </aside>
  );
}
