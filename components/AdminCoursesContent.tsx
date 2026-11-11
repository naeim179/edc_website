"use client";
import Link from "next/link";
import AdminCourseCard from "@/components/admin/AdminCourseCard";
import { useLanguage } from "@/components/LanguageProvider";
import Pagination from "@/components/ui/Pagination";
import type { CourseListPage, ListFilters } from "@/lib/list-pages";

export default function AdminCoursesContent({
  data,
  filters,
  canCleanup = false,
}: {
  data: CourseListPage;
  filters: ListFilters;
  canCleanup?: boolean;
}) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const field = "w-full rounded-xl border bg-[var(--brand-surface)] px-4 py-3";
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-6"
      dir={ar ? "rtl" : "ltr"}
    >
      <h1 className="text-2xl font-bold">{t.admin.manageCoursesTitle}</h1>
      {canCleanup && (
        <Link
          href="/admin/video-uploads"
          className="inline-flex min-h-11 items-center rounded-xl border border-[var(--brand-border)] px-4 py-2 font-bold underline underline-offset-4"
        >
          {ar
            ? "مراجعة رفعات الفيديو المتروكة"
            : "Review abandoned video uploads"}
        </Link>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [ar ? "كل الدورات" : "Total courses", data.summary.courses],
          [ar ? "منشور" : "Published", data.summary.published],
          [ar ? "مسودة" : "Drafts", data.summary.draft],
          [ar ? "التسجيلات" : "Enrollments", data.summary.students],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border bg-[var(--brand-surface)] p-5"
          >
            <p className="text-sm text-[var(--brand-text-muted)]">{label}</p>
            <p className="text-2xl font-bold">
              {Number(value ?? 0).toLocaleString(ar ? "ar-JO" : "en-US")}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/admin/courses/new"
        className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-ink)] px-5 py-3 font-bold text-[var(--brand-on-ink)]"
      >
        {t.admin.addCourse}
      </Link>
      <form
        key={JSON.stringify(filters)}
        action="/admin/courses"
        method="get"
        className="grid gap-4 rounded-2xl border bg-[var(--brand-surface)] p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="sm:col-span-2 lg:col-span-4">
          <label
            htmlFor="admin-course-search"
            className="mb-2 block font-semibold"
          >
            {ar ? "البحث عن دورة أو مدرب" : "Search course or instructor"}
          </label>
          <input
            id="admin-course-search"
            name="q"
            type="search"
            maxLength={120}
            defaultValue={filters.q}
            className={field}
          />
        </div>
        <div>
          <label
            htmlFor="admin-course-status"
            className="mb-2 block font-semibold"
          >
            {ar ? "حالة النشر" : "Publication status"}
          </label>
          <select
            id="admin-course-status"
            name="status"
            defaultValue={filters.status}
            className={field}
          >
            <option value="all">{ar ? "الكل" : "All"}</option>
            <option value="published">{ar ? "منشور" : "Published"}</option>
            <option value="draft">{ar ? "مسودة" : "Draft"}</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="admin-course-type"
            className="mb-2 block font-semibold"
          >
            {ar ? "نوع الدورة" : "Course type"}
          </label>
          <select
            id="admin-course-type"
            name="type"
            defaultValue={filters.type}
            className={field}
          >
            <option value="all">{ar ? "كل الأنواع" : "All types"}</option>
            <option value="group">{ar ? "قروب" : "Group"}</option>
            <option value="private">{ar ? "خاص" : "Private"}</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="admin-course-sort"
            className="mb-2 block font-semibold"
          >
            {ar ? "الترتيب" : "Sort"}
          </label>
          <select
            id="admin-course-sort"
            name="sort"
            defaultValue={filters.sort}
            className={field}
          >
            <option value="latest">{ar ? "الأحدث" : "Newest"}</option>
            <option value="students">
              {ar ? "الأكثر طلابًا" : "Most students"}
            </option>
            <option value="lessons">
              {ar ? "الأكثر دروسًا" : "Most lessons"}
            </option>
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-[var(--brand-ink)] px-5 py-3 font-bold text-[var(--brand-on-ink)]"
          >
            {ar ? "بحث وفلترة" : "Search"}
          </button>
          <Link href="/admin/courses" className="py-3 underline">
            {ar ? "مسح الفلاتر" : "Clear filters"}
          </Link>
        </div>
      </form>
      <h2
        id="list-results"
        tabIndex={-1}
        className="scroll-mt-5 text-xl font-bold"
      >
        {ar ? "نتائج الدورات" : "Course results"} (
        {data.total.toLocaleString(ar ? "ar-JO" : "en-US")})
      </h2>
      {data.items.length ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((course) => (
            <AdminCourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <p role="status" className="rounded-2xl border p-8 text-center">
          {ar
            ? "لا توجد دورات مطابقة للفلاتر."
            : "No courses match your filters."}
        </p>
      )}
      <Pagination
        {...data}
        pathname="/admin/courses"
        query={{
          q: filters.q,
          status: filters.status,
          type: filters.type,
          sort: filters.sort,
        }}
      />
    </div>
  );
}
