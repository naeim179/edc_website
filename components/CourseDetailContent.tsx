"use client";

import Link from "next/link";
import EnrollButton from "@/components/EnrollButton";
import BuyCourseButton from "@/components/BuyCourseButton";
import { useLanguage } from "@/components/LanguageProvider";

type Lesson = {
  id: string;
  title: string;
  content_url?: string | null;
  order_index?: number;
  is_free_preview?: boolean | null;
};

type Section = {
  id: string;
  title: string;
  order_index?: number;
  lessons?: Lesson[] | null;
};

type TeacherProfile = {
  image_url: string | null;
  bio: string | null;
  specialization: string | null;
  experience_years: number | null;
};

type Teacher = {
  id: string;
  full_name: string | null;
  teacher_profiles?: TeacherProfile | TeacherProfile[] | null;
};

type Course = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  is_free: boolean | null;
  price: number | null;
  currency: string | null;
  discount_type: "percentage" | "fixed" | null;
  discount_value: number | null;
  course_type: "group" | "private";

  sections?: Section[];

  course_instructors?: {
    teacher?: Teacher | Teacher[] | null;
  }[];
};

type Props = {
  course: Course;
  sections: Section[];
  enrollmentId: string | null;
  completedLessonIds: string[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
};

/* ---------- helpers ---------- */

// جمع عربي صحيح: قسم واحد / قسمان / 3 أقسام / 11 قسمًا
function arabicCount(
  n: number,
  forms: { one: string; two: string; few: string; many: string }
) {
  if (n === 0) return `0 ${forms.few}`;
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

function formatCount(
  n: number,
  isArabic: boolean,
  kind: "section" | "lesson"
) {
  if (isArabic) {
    return kind === "section"
      ? arabicCount(n, {
          one: "قسم واحد",
          two: "قسمان",
          few: "أقسام",
          many: "قسمًا",
        })
      : arabicCount(n, {
          one: "درس واحد",
          two: "درسان",
          few: "دروس",
          many: "درسًا",
        });
  }

  const word = kind === "section" ? "Section" : "Lesson";
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function formatYears(n: number, isArabic: boolean) {
  if (!isArabic) return `${n} ${n === 1 ? "year" : "years"} of experience`;
  if (n === 1) return "سنة خبرة";
  if (n === 2) return "سنتان خبرة";
  if (n >= 3 && n <= 10) return `${n} سنوات خبرة`;
  return `${n} سنة خبرة`;
}

/* ---------- small icons ---------- */

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

/* ---------- component ---------- */

export default function CourseDetailContent({
  course,
  sections,
  enrollmentId,
  completedLessonIds,
  totalLessons,
  completedLessons,
  progressPercent,
}: Props) {
  const { language } = useLanguage();
  const isArabic = language === "ar";
  const currency = course.currency ?? "JOD";


  /* ----- price ----- */

  const originalPrice = course.price ?? 0;
  const discountValue = course.discount_value ?? 0;

  let finalPrice = originalPrice;

  if (course.discount_type === "percentage") {
    finalPrice =
      originalPrice - originalPrice * (discountValue / 100);
  }

  if (course.discount_type === "fixed") {
    finalPrice = originalPrice - discountValue;
  }

  finalPrice = Math.max(0, finalPrice);

  const hasDiscount =
    !course.is_free &&
    originalPrice > 0 &&
    discountValue > 0 &&
    finalPrice < originalPrice;

  const discountLabel =
    course.discount_type === "percentage"
      ? isArabic
        ? `خصم ${discountValue}%`
        : `${discountValue}% off`
      : isArabic
      ? `خصم ${discountValue} ${currency}`
      : `${discountValue} ${currency} off`;

  /* ----- teacher ----- */

  const teacherData =
    course.course_instructors?.[0]?.teacher ?? null;

  const teacher = Array.isArray(teacherData)
    ? teacherData[0] ?? null
    : teacherData;

  const teacherProfileData = teacher?.teacher_profiles ?? null;

  const teacherProfile = Array.isArray(teacherProfileData)
    ? teacherProfileData[0] ?? null
    : teacherProfileData;

  /* ----- lessons order + continue learning ----- */

  const orderedSections = sections.map((section) => ({
    ...section,
    lessons: [...(section.lessons ?? [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    ),
  }));

  const allLessons = orderedSections.flatMap(
    (section) => section.lessons
  );

  const nextLesson =
    allLessons.find(
      (lesson) => !completedLessonIds.includes(lesson.id)
    ) ?? null;

  const firstLesson = allLessons[0] ?? null;

  const isCompleted =
    totalLessons > 0 && completedLessons >= totalLessons;

  const isStarted = completedLessons > 0;

  // الحالة تتغير حسب التقدم بدل ما تبقى "مسجل بالدورة" دائماً
  const statusLabel = isCompleted
    ? isArabic
      ? "مكتملة"
      : "Completed"
    : isStarted
    ? isArabic
      ? "قيد التعلم"
      : "In progress"
    : isArabic
    ? "مسجل بالدورة"
    : "Enrolled";

  const statusColor = isCompleted
    ? "text-emerald-600"
    : "text-[#124b8a]";

  const ctaLesson = isCompleted ? firstLesson : nextLesson;

  const ctaLabel = isCompleted
    ? isArabic
      ? "راجع الدورة"
      : "Review course"
    : isStarted
    ? isArabic
      ? "تابع التعلم"
      : "Continue learning"
    : isArabic
    ? "ابدأ الدورة"
    : "Start course";

  // سطر المدرب المختصر داخل الهيرو
  const instructorStrip = teacher ? (
    <Link
      href={`/instructors/${teacher.id}`}
      className="mt-5 inline-flex items-center gap-3 max-w-full rounded-full bg-white/10 hover:bg-white/20 transition pe-5 ps-1.5 py-1.5"
    >
      <span className="w-11 h-11 rounded-full overflow-hidden bg-white/20 border-2 border-white/60 shrink-0 flex items-center justify-center">
        {teacherProfile?.image_url ? (
          <img
            src={teacherProfile.image_url}
            alt={teacher.full_name ?? "Teacher"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-white">
            {(teacher.full_name ?? "T").charAt(0).toUpperCase()}
          </span>
        )}
      </span>

      <span className="min-w-0 text-start">
        <span className="block text-sm font-bold text-white truncate">
          {isArabic ? "مع " : "With "}
          {teacher.full_name ??
            (isArabic ? "مدرب الدورة" : "Course Instructor")}
        </span>

        <span className="flex flex-wrap gap-x-3 text-xs text-white/80">
          {teacherProfile?.specialization && (
            <span>{teacherProfile.specialization}</span>
          )}
          {teacherProfile?.experience_years != null &&
            teacherProfile.experience_years > 0 && (
              <span>
                {formatYears(teacherProfile.experience_years, isArabic)}
              </span>
            )}
        </span>
      </span>
    </Link>
  ) : null;

  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-7"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* COURSE HERO */}

      <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden">
        {course.image_url ? (
          <div className="relative h-64 md:h-[330px] overflow-hidden">
            <img
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

            <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 text-white">
              {course.category && (
                <span className="inline-flex rounded-full bg-white/90 text-[#124b8a] px-4 py-2 text-xs font-bold mb-4">
                  {course.category}
                </span>
              )}

              <h1 className="text-3xl md:text-4xl font-bold">
                {course.title}
              </h1>
{instructorStrip}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#124b8a] to-[#0d3765] p-8 text-white">
            {course.category && (
              <span className="inline-flex rounded-full bg-white/90 text-[#124b8a] px-4 py-2 text-xs font-bold mb-4">
                {course.category}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-bold">
              {course.title}
            </h1>
{instructorStrip}
          </div>
        )}

        <div className="p-6 md:p-8">
          {course.description && (
            <p className="text-slate-600 leading-8 text-base md:text-lg mb-7">
              {course.description}
            </p>
          )}

          {/* COURSE STATS */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LESSONS */}

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-400">
                {isArabic ? "عدد الدروس" : "Lessons"}
              </p>

              <p className="font-bold text-2xl mt-2 text-slate-900">
                {totalLessons}
              </p>
            </div>

            {/* PRICE / STATUS */}

            <div className="rounded-2xl bg-slate-50 p-5">
              {enrollmentId ? (
                <>
                  <p className="text-sm text-slate-400">
                    {isArabic ? "الحالة" : "Status"}
                  </p>

                  <p
                    className={`font-bold text-2xl mt-2 ${statusColor}`}
                  >
                    {statusLabel}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400">
                    {isArabic ? "السعر" : "Price"}
                  </p>

                  {course.is_free ? (
                    <p className="font-bold text-2xl text-emerald-600 mt-2">
                      {isArabic ? "مجانية" : "Free"}
                    </p>
                  ) : hasDiscount ? (
                    <div className="mt-2">
                      <p className="text-sm text-slate-400 line-through">
                        {originalPrice.toFixed(2)} {currency}
                      </p>

                      <p className="font-bold text-2xl text-emerald-600">
                        {finalPrice.toFixed(2)} {currency}
                      </p>

                      <span className="inline-flex mt-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                        {discountLabel}
                      </span>
                    </div>
                  ) : (
                    <p className="font-bold text-2xl text-slate-900 mt-2">
                      {finalPrice.toFixed(2)} {currency}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* PROGRESS */}

          {enrollmentId && (
            <div className="mt-7">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-[#124b8a]">
                  {progressPercent}%
                </span>

                <span className="text-slate-500">
                  {completedLessons} / {totalLessons}
                </span>
              </div>

              <div
                className="h-3 bg-slate-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    isCompleted ? "bg-emerald-500" : "bg-[#124b8a]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* ACTION: buy / enroll / continue */}

          {(!enrollmentId || ctaLesson) && (
            <div className="mt-7 flex justify-end">
              {enrollmentId ? (
                ctaLesson && (
                  <Link
                    href={`/courses/${course.id}/lessons/${ctaLesson.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#124b8a] hover:bg-[#0d3765] text-white font-bold px-6 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#124b8a]"
                  >
                    <PlayIcon />
                    {ctaLabel}
                  </Link>
                )
              ) : course.is_free ? (
                <EnrollButton courseId={course.id} />
              ) : (
                <BuyCourseButton courseId={course.id} />
              )}
            </div>
          )}
        </div>
      </section>

      {/* COURSE CONTENT */}

      <section className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">
            {isArabic ? "محتوى الدورة" : "Course Content"}
          </h2>

          <span className="text-sm text-slate-400">
            {formatCount(orderedSections.length, isArabic, "section")}
          </span>
        </div>

        {orderedSections.map((section) => (
          <div
            key={section.id}
            className="border border-slate-200 rounded-2xl mb-4 overflow-hidden"
          >
            <div className="bg-slate-50 p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">{section.title}</h3>

              <span className="text-sm text-slate-500">
                {formatCount(section.lessons.length, isArabic, "lesson")}
              </span>
            </div>

            <div className="p-3 space-y-2">
              {section.lessons.map((lesson) => {
                const completed = completedLessonIds.includes(
                  lesson.id
                );

                const canOpen =
                  Boolean(enrollmentId) ||
                  Boolean(lesson.is_free_preview);

                const iconStyle = completed
                  ? "bg-emerald-100 text-emerald-600"
                  : canOpen
                  ? "bg-blue-100 text-[#124b8a]"
                  : "bg-slate-200 text-slate-400";

                const statusText = completed ? (
                  <span className="text-emerald-600 font-bold">
                    {isArabic ? "مكتمل" : "Done"}
                  </span>
                ) : canOpen ? (
                  <span className="text-blue-600">
                    {isArabic ? "غير مكتمل" : "Not done"}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {isArabic ? "مغلق" : "Locked"}
                  </span>
                );

                const lessonContent = (
                  <>
                    <span className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconStyle}`}
                      >
                        {completed ? (
                          <CheckIcon />
                        ) : canOpen ? (
                          <PlayIcon />
                        ) : (
                          <LockIcon />
                        )}
                      </span>

                      <span className="font-medium text-slate-800 truncate">
                        {lesson.title}
                      </span>
                    </span>

                    <span className="text-sm shrink-0">
                      {statusText}
                    </span>
                  </>
                );

                return canOpen ? (
                  <Link
                    key={lesson.id}
                    href={`/courses/${course.id}/lessons/${lesson.id}`}
                    className="flex justify-between items-center gap-4 bg-slate-50 hover:bg-blue-50 rounded-xl p-4 transition"
                  >
                    {lessonContent}
                  </Link>
                ) : (
                  <div
                    key={lesson.id}
                    className="flex justify-between items-center gap-4 bg-slate-50 rounded-xl p-4 opacity-70"
                  >
                    {lessonContent}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
