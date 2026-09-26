"use client";

import Link from "next/link";
import EnrollButton from "@/components/EnrollButton";
import SubscriptionRenewalControls from "@/components/SubscriptionRenewalControls";
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

type SubscriptionInfo = {
  expiresAt: string | null;
  autoRenew: boolean;
  durationMonths: number;
  active: boolean;
  daysRemaining: number | null;
};

type Props = {
  course: Course;
  sections: Section[];
  enrollmentId: string | null;
  hasCourseAccess: boolean;
  subscription: SubscriptionInfo | null;
  completedLessonIds: string[];
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
};

/* ---------- helpers ---------- */

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
  hasCourseAccess,
  subscription,
  completedLessonIds,
  totalLessons,
  completedLessons,
  progressPercent,
}: Props) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  /* ----- price ----- */

  const originalPrice = course.price ?? 0;
  const discountValue = course.discount_value ?? 0;

  let finalPrice = originalPrice;

  if (course.discount_type === "percentage") {
    finalPrice = originalPrice - originalPrice * (discountValue / 100);
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
      ? `خصم ${discountValue} USD`
      : `${discountValue} USD off`;

  /* ----- teacher ----- */

  const teacherData = course.course_instructors?.[0]?.teacher ?? null;

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

  const allLessons = orderedSections.flatMap((section) => section.lessons);

  const nextLesson =
    allLessons.find((lesson) => !completedLessonIds.includes(lesson.id)) ??
    null;

  const firstLesson = allLessons[0] ?? null;

  const isCompleted = totalLessons > 0 && completedLessons >= totalLessons;

  const isStarted = completedLessons > 0;

  const subscriptionExpired =
    Boolean(enrollmentId) && !course.is_free && !hasCourseAccess;

  const statusLabel = subscriptionExpired
    ? isArabic
      ? "انتهى الاشتراك"
      : "Subscription expired"
    : isCompleted
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

  const statusColor = subscriptionExpired
    ? "text-red-600"
    : isCompleted
    ? "text-emerald-700"
    : "text-[#1B4B43]";

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

  return (
    <div
      className="mx-auto w-full max-w-5xl"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="overflow-hidden rounded-3xl border border-[#E8E1D4] bg-white">
        {/* HERO — البانر، النقطة البصرية الوحيدة القوية بالصفحة */}

        {course.image_url ? (
          <div className="relative h-64 overflow-hidden md:h-[300px]">
            <img
              src={course.image_url}
              alt={course.title}
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#0F332D]/85 via-[#0F332D]/25 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
              {course.category && (
                <span className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-[#8A3F2A]">
                  {course.category}
                </span>
              )}

              <h1 className="text-3xl font-bold md:text-4xl">
                {course.title}
              </h1>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1B4B43] to-[#0F332D] p-6 text-white md:p-10">
            <div
              aria-hidden="true"
              className="absolute -end-16 -bottom-16 h-56 w-56 rotate-45 bg-white/[0.05]"
            />

            <div
              aria-hidden="true"
              className="absolute -start-10 -top-16 h-40 w-40 rotate-45 bg-white/[0.04]"
            />

            {course.category && (
              <span className="relative mb-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-[#8A3F2A]">
                {course.category}
              </span>
            )}

            <h1 className="relative text-3xl font-bold md:text-4xl">
              {course.title}
            </h1>
          </div>
        )}

        {/* المحتوى كله يتدفق ببعض بدون صناديق فرعية */}

        <div className="p-6 md:p-10">
          {course.description && (
            <p className="text-base leading-8 text-[#6B6155] md:text-lg">
              {course.description}
            </p>
          )}

          {/* STATS — صف بسيط بفاصل عمودي بدل صناديق */}

          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-[#F0EBE1] py-6">
            <div>
              <p className="text-xs text-[#A69C8C]">
                {isArabic ? "عدد الدروس" : "Lessons"}
              </p>

              <p className="mt-1 text-2xl font-bold text-[#2A2420]">
                {totalLessons}
              </p>
            </div>

            <div className="hidden h-10 w-px bg-[#E8E1D4] sm:block" />

            <div>
              {enrollmentId ? (
                <>
                  <p className="text-xs text-[#A69C8C]">
                    {isArabic ? "الحالة" : "Status"}
                  </p>

                  <p className={`mt-1 text-2xl font-bold ${statusColor}`}>
                    {statusLabel}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-[#A69C8C]">
                    {isArabic ? "السعر" : "Price"}
                  </p>

                  {course.is_free ? (
                    <p className="mt-1 text-2xl font-bold text-emerald-700">
                      {isArabic ? "مجانية" : "Free"}
                    </p>
                  ) : hasDiscount ? (
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <p className="text-2xl font-bold text-emerald-700">
                        {finalPrice.toFixed(2)} USD
                      </p>

                      <span className="text-sm text-[#A69C8C] line-through">
                        {originalPrice.toFixed(2)}
                      </span>

                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                        {discountLabel}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-2xl font-bold text-[#2A2420]">
                      {finalPrice.toFixed(2)} USD
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* PROGRESS */}

          {enrollmentId && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-bold text-[#1B4B43]">
                  {progressPercent}%
                </span>

                <span className="text-[#A69C8C]">
                  {completedLessons} / {totalLessons}
                </span>
              </div>

              <div
                className="h-3 overflow-hidden rounded-full bg-[#F0EBE1]"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    isCompleted ? "bg-emerald-500" : "bg-[#1B4B43]"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* SUBSCRIPTION */}

          {enrollmentId && !course.is_free && subscription && (
            <SubscriptionRenewalControls
              courseId={course.id}
              expiresAt={subscription.expiresAt}
              autoRenew={subscription.autoRenew}
              accessActive={hasCourseAccess}
              daysRemaining={subscription.daysRemaining}
            />
          )}

          {/* ACTION */}

          <div className="mt-6 flex justify-end">
            {enrollmentId && !hasCourseAccess && !course.is_free ? (
              <Link
                href={`/checkout/${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9704A] px-6 py-3 font-bold text-white transition hover:bg-[#B15F3B]"
              >
                {isArabic ? "تجديد الاشتراك" : "Renew subscription"}
              </Link>
            ) : hasCourseAccess ? (
              ctaLesson ? (
                <Link
                  href={`/courses/${course.id}/lessons/${ctaLesson.id}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B4B43] px-6 py-3 font-bold text-white transition hover:bg-[#123A34] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4B43]"
                >
                  <PlayIcon />
                  {ctaLabel}
                </Link>
              ) : null
            ) : course.is_free ? (
              <EnrollButton courseId={course.id} />
            ) : (
              <Link
                href={`/checkout/${course.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#C9704A] px-6 py-3 font-bold text-white transition hover:bg-[#B15F3B]"
              >
                {isArabic ? "اختر الاشتراك واشترِ الآن" : "Choose subscription"}
              </Link>
            )}
          </div>

          {/* INSTRUCTOR — بدون صندوق، مفصول بخط علوي بس */}

          {teacher && (
            <div className="mt-10 border-t border-[#F0EBE1] pt-8">
              <h2 className="mb-5 text-lg font-bold text-[#2A2420]">
                {isArabic ? "معلم الدورة" : "Course Instructor"}
              </h2>

              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F7F3EC] text-2xl font-bold text-[#1B4B43]">
                  {teacherProfile?.image_url ? (
                    <img
                      src={teacherProfile.image_url}
                      alt={teacher.full_name ?? "Teacher"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (teacher.full_name ?? "T").charAt(0).toUpperCase()
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-[#2A2420]">
                    {teacher.full_name ??
                      (isArabic ? "مدرب الدورة" : "Course Instructor")}
                  </h3>

                  <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-[#8A3F2A]">
                    {teacherProfile?.specialization && (
                      <span>{teacherProfile.specialization}</span>
                    )}

                    {teacherProfile?.experience_years != null &&
                      teacherProfile.experience_years > 0 && (
                        <span className="text-[#6B6155]">
                          {formatYears(
                            teacherProfile.experience_years,
                            isArabic
                          )}
                        </span>
                      )}
                  </p>

                  {teacherProfile?.bio && (
                    <p className="mt-3 text-sm leading-7 text-[#6B6155]">
                      {teacherProfile.bio}
                    </p>
                  )}
                </div>

                <Link
                  href={`/instructors/${teacher.id}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#1B4B43] px-5 py-2.5 text-sm font-bold text-[#1B4B43] transition hover:bg-[#F7F3EC]"
                >
                  {isArabic ? "عرض الملف الشخصي" : "View profile"}
                </Link>
              </div>
            </div>
          )}

          {/* COURSE CONTENT — بدون صناديق، قائمة مفصولة بخطوط */}

          <div className="mt-10 border-t border-[#F0EBE1] pt-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#2A2420] md:text-3xl">
                {isArabic ? "محتوى الدورة" : "Course Content"}
              </h2>

              <span className="text-sm text-[#A69C8C]">
                {formatCount(orderedSections.length, isArabic, "section")}
              </span>
            </div>

            <div className="space-y-8">
              {orderedSections.map((section) => (
                <div key={section.id}>
                  <div className="mb-3 flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                    <h3 className="text-lg font-bold text-[#2A2420]">
                      {section.title}
                    </h3>

                    <span className="text-sm text-[#A69C8C]">
                      {formatCount(section.lessons.length, isArabic, "lesson")}
                    </span>
                  </div>

                  <div>
                    {section.lessons.map((lesson) => {
                      const completed = completedLessonIds.includes(
                        lesson.id
                      );

                      const canOpen =
                        hasCourseAccess || Boolean(lesson.is_free_preview);

                      const iconStyle = completed
                        ? "bg-emerald-100 text-emerald-700"
                        : canOpen
                        ? "bg-[#F7F3EC] text-[#1B4B43]"
                        : "bg-[#F0EBE1] text-[#A69C8C]";

                      const statusText = completed ? (
                        <span className="font-bold text-emerald-700">
                          {isArabic ? "مكتمل" : "Done"}
                        </span>
                      ) : canOpen ? (
                        <span className="text-[#1B4B43]">
                          {isArabic ? "غير مكتمل" : "Not done"}
                        </span>
                      ) : (
                        <span className="text-[#A69C8C]">
                          {isArabic ? "مغلق" : "Locked"}
                        </span>
                      );

                      const lessonContent = (
                        <>
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconStyle}`}
                            >
                              {completed ? (
                                <CheckIcon />
                              ) : canOpen ? (
                                <PlayIcon />
                              ) : (
                                <LockIcon />
                              )}
                            </span>

                            <span className="truncate font-medium text-[#2A2420]">
                              {lesson.title}
                            </span>
                          </span>

                          <span className="shrink-0 text-sm">
                            {statusText}
                          </span>
                        </>
                      );

                      return canOpen ? (
                        <Link
                          key={lesson.id}
                          href={`/courses/${course.id}/lessons/${lesson.id}`}
                          className="flex items-center justify-between gap-4 border-b border-[#F0EBE1] px-1 py-4 transition last:border-b-0 hover:bg-[#F7F3EC]/60"
                        >
                          {lessonContent}
                        </Link>
                      ) : (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between gap-4 border-b border-[#F0EBE1] px-1 py-4 opacity-70 last:border-b-0"
                        >
                          {lessonContent}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
