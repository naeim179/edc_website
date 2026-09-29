"use client";

import Link from "next/link";
import CourseCatalogCard from "@/components/CourseCatalogCard";
import CourseCover from "@/components/CourseCover";
import { useLanguage } from "@/components/LanguageProvider";
import { ArrowIcon, PlayIcon } from "@/components/icons";
import type { CatalogCourse } from "@/lib/course-catalog";
import type { StudentCourse } from "@/lib/student-courses";

type Props = {
  isAuthenticated: boolean;
  displayName: string;
  stats: {
    enrolled: number;
    completedLessons: number;
    completedCourses: number;
  };
  continueCourse: StudentCourse | null;
  courses: CatalogCourse[];
};

export default function HomeContent({
  isAuthenticated,
  displayName,
  stats,
  continueCourse,
  courses,
}: Props) {
  const { language, t } = useLanguage();
  const isArabic = language === "ar";

  const statItems = [
    {
      value: stats.enrolled,
      label: t.home.enrolledCourses,
    },
    {
      value: stats.completedLessons,
      label: t.home.completedLessons,
    },
    {
      value: stats.completedCourses,
      label: t.home.completedCourses,
    },
  ];

  const continueHref = continueCourse
    ? continueCourse.nextLessonId
      ? `/courses/${continueCourse.id}/lessons/${continueCourse.nextLessonId}`
      : `/courses/${continueCourse.id}`
    : "/courses";

  const heroShapes = (
    <>
      <div
        aria-hidden="true"
        className="absolute -end-16 -bottom-20 h-64 w-64 rotate-45 bg-white/[0.05]"
      />

      <div
        aria-hidden="true"
        className="absolute -start-12 -top-20 h-44 w-44 rotate-45 bg-white/[0.04]"
      />
    </>
  );

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-10"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {isAuthenticated ? (
        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            borderColor: "var(--brand-border)",
            backgroundColor: "var(--brand-surface)",
          }}
        >
          {/* HERO */}
          <div
            className="relative overflow-hidden px-6 py-8 text-white sm:px-10 sm:py-10"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--hero-start), var(--hero-end))",
            }}
          >
            {heroShapes}

            <div className="relative">
              <p className="text-sm text-white/70">
                {t.home.welcomeBack}
              </p>

              <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">
                {t.home.hello} {displayName}
              </h1>

              <p className="mt-3 max-w-md leading-7 text-white/75">
                {isArabic
                  ? "أكمل رحلتك التعليمية من حيث توقفت."
                  : "Pick up your learning journey where you left off."}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-white/15 pt-6">
                {statItems.map((item, index) => (
                  <div key={item.label} className="flex items-center gap-10">
                    {index > 0 && (
                      <span className="hidden h-9 w-px bg-white/15 sm:block" />
                    )}

                    <div>
                      <p className="text-2xl font-bold text-white sm:text-3xl">
                        {item.value}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/65">
                        {item.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CONTINUE LEARNING */}

          {continueCourse ? (
            <Link
              href={continueHref}
              className="m-6 flex flex-col gap-5 rounded-2xl border p-5 transition sm:flex-row sm:items-center sm:p-6"
              style={{
                borderColor: "var(--brand-border)",
                backgroundColor: "var(--brand-bg)",
              }}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20">
                <CourseCover
                  image={continueCourse.image}
                  title={continueCourse.title}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className="text-xs font-bold"
                  style={{ color: "var(--brand-clay)" }}
                >
                  {isArabic
                    ? "تابع من حيث توقفت"
                    : "Continue where you left off"}
                </p>

                <h2
                  className="mt-0.5 truncate text-lg font-bold"
                  style={{ color: "var(--brand-text)" }}
                >
                  {continueCourse.title}
                </h2>

                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full sm:max-w-xs"
                    style={{ backgroundColor: "var(--brand-border-soft)" }}
                    role="progressbar"
                    aria-valuenow={continueCourse.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${continueCourse.progress}%`,
                        backgroundColor: "var(--brand-ink)",
                      }}
                    />
                  </div>

                  <span
                    className="shrink-0 text-xs font-bold"
                    style={{ color: "var(--brand-ink)" }}
                  >
                    {continueCourse.progress}%
                  </span>

                  <span
                    className="shrink-0 text-xs"
                    style={{ color: "var(--brand-text-faint)" }}
                  >
                    {isArabic
                      ? `${continueCourse.completedLessons}/${continueCourse.totalLessons} درس`
                      : `${continueCourse.completedLessons}/${continueCourse.totalLessons}`}
                  </span>
                </div>
              </div>

              <span
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition"
                style={{ backgroundColor: "var(--brand-ink)" }}
              >
                <PlayIcon width={14} height={14} />
                {continueCourse.progress > 0
                  ? isArabic
                    ? "متابعة"
                    : "Continue"
                  : isArabic
                  ? "ابدأ"
                  : "Start"}
              </span>
            </Link>
          ) : (
            <div className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--brand-text)" }}
                >
                  {stats.enrolled > 0
                    ? isArabic
                      ? "أنجزت كل دوراتك 🎉"
                      : "You finished all your courses 🎉"
                    : isArabic
                    ? "ابدأ رحلتك الأولى"
                    : "Start your first course"}
                </h2>

                <p
                  className="mt-1 text-sm leading-6"
                  style={{ color: "var(--brand-text-muted)" }}
                >
                  {isArabic
                    ? "تصفّح الدورات المتاحة واختر ما يناسب هدفك."
                    : "Browse the available courses and pick what fits your goal."}
                </p>
              </div>

              <Link
                href="/courses"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: "var(--brand-ink)" }}
              >
                {t.home.browseCourses}
                <ArrowIcon
                  width={16}
                  height={16}
                  className="rtl:rotate-180"
                />
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section
          className="relative overflow-hidden rounded-3xl p-8 text-white sm:p-12"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--brand-ink), var(--brand-ink-hover))",
          }}
        >
          {heroShapes}

          <div className="relative max-w-2xl">
            <p className="text-sm text-white/70">
              {isArabic
                ? "منصتك للتعلم والتطور"
                : "Your platform for learning and growth"}
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-5xl">
              {isArabic
                ? "ابدأ رحلتك التعليمية اليوم"
                : "Start your learning journey today"}
            </h1>

            <p className="mt-4 leading-8 text-white/75">
              {isArabic
                ? "استعرض الدورات المتاحة، أنشئ حسابك، وتابع تقدمك من مكان واحد."
                : "Browse available courses, create your account, and track your progress in one place."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: "var(--brand-terracotta)" }}
              >
                {t.home.createAccount}
              </Link>

              <Link
                href="/courses"
                className="rounded-xl border border-white/30 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                {isArabic ? "استعراض الدورات" : "Browse courses"}
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div
          className="flex items-center justify-between gap-4 rounded-2xl border px-5 py-4"
          style={{
            borderColor: "var(--brand-border)",
            backgroundColor: "var(--brand-surface)",
          }}
        >
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--brand-text)" }}
          >
            {t.home.latestCourses}
          </h2>

          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: "var(--brand-ink)" }}
          >
            {t.home.viewAllCourses}
            <ArrowIcon
              width={16}
              height={16}
              className="rtl:rotate-180"
            />
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCatalogCard
                key={course.id}
                id={course.id}
                title={course.title}
                category={course.category}
                instructor={course.instructor}
                lessons={course.lessons}
                progress={course.progress}
                image={course.image}
                enrolled={course.enrolled}
                price={course.price}
                currency={course.currency}
                isFree={course.isFree}
                discountType={course.discountType}
                discountValue={course.discountValue}
                deliveryType={course.deliveryType}
              />
            ))}
          </div>
        ) : (
          <div
            className="border-t pt-8 text-center"
            style={{
              borderColor: "var(--brand-border-soft)",
              color: "var(--brand-text-faint)",
            }}
          >
            {isArabic
              ? "لا توجد دورات منشورة حاليًا."
              : "No published courses yet."}
          </div>
        )}
      </section>
    </div>
  );
}
