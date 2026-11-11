"use client";
import Link from "next/link";
import CourseCatalogCard from "@/components/CourseCatalogCard";
import { useLanguage } from "@/components/LanguageProvider";
import Pagination from "@/components/ui/Pagination";
import type { CatalogCourse } from "@/lib/course-catalog";
import type { ListFilters, PageInfo } from "@/lib/list-pages";

export default function CoursesContent({
  courses,
  categories,
  filters,
  pageInfo,
}: {
  courses: CatalogCourse[];
  categories: string[];
  filters: ListFilters;
  pageInfo: PageInfo;
}) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const field = "w-full rounded-xl border bg-[var(--brand-surface)] px-4 py-3";
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      dir={ar ? "rtl" : "ltr"}
    >
      <section className="yw-page-banner yw-banner-forest rounded-3xl p-8">
        <h1 className="text-3xl font-bold">{t.courses.allCourses}</h1>
        <p className="mt-2">
          {ar
            ? "اكتشف الدورات التعليمية واختر ما يناسبك."
            : "Discover courses and choose what fits your goal."}
        </p>
      </section>
      <form
        key={JSON.stringify(filters)}
        action="/courses"
        method="get"
        className="grid gap-4 rounded-2xl border bg-[var(--brand-surface)] p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="catalog-search" className="mb-2 block font-semibold">
            {ar
              ? "ابحث عن دورة أو تصنيف أو مدرب"
              : "Search course, category or instructor"}
          </label>
          <input
            id="catalog-search"
            type="search"
            name="q"
            maxLength={120}
            defaultValue={filters.q}
            className={field}
          />
        </div>
        <div>
          <label
            htmlFor="catalog-category"
            className="mb-2 block font-semibold"
          >
            {ar ? "التصنيف" : "Category"}
          </label>
          <select
            id="catalog-category"
            name="category"
            defaultValue={filters.category}
            className={field}
          >
            <option value="">{ar ? "كل التصنيفات" : "All categories"}</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="catalog-price" className="mb-2 block font-semibold">
            {ar ? "السعر" : "Price"}
          </label>
          <select
            id="catalog-price"
            name="price"
            defaultValue={filters.price}
            className={field}
          >
            <option value="all">{ar ? "الكل" : "All"}</option>
            <option value="free">{ar ? "مجاني" : "Free"}</option>
            <option value="paid">{ar ? "مدفوع" : "Paid"}</option>
          </select>
        </div>
        <div>
          <label htmlFor="catalog-sort" className="mb-2 block font-semibold">
            {ar ? "الترتيب" : "Sort"}
          </label>
          <select
            id="catalog-sort"
            name="sort"
            defaultValue={filters.sort}
            className={field}
          >
            <option value="latest">{ar ? "الأحدث" : "Newest"}</option>
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
          <Link href="/courses" className="py-3 underline underline-offset-4">
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
        {pageInfo.total.toLocaleString(ar ? "ar-JO" : "en-US")})
      </h2>
      {courses.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCatalogCard key={c.id} {...c} />
          ))}
        </div>
      ) : (
        <div role="status" className="rounded-2xl border p-8 text-center">
          <p>
            {ar
              ? "لا توجد دورات مطابقة للبحث والفلاتر."
              : "No courses match your search and filters."}
          </p>
          <Link href="/courses" className="mt-3 inline-block underline">
            {ar ? "عرض جميع الدورات" : "View all courses"}
          </Link>
        </div>
      )}
      <Pagination
        {...pageInfo}
        pathname="/courses"
        query={{
          q: filters.q,
          category: filters.category,
          price: filters.price,
          sort: filters.sort,
        }}
      />
    </div>
  );
}
