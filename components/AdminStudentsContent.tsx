"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/LanguageProvider";

type StudentStatus =
  | "all"
  | "active"
  | "expired"
  | "no_courses";

type Student = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;

  enrollments_count: number;
  active_courses_count: number;
  expired_courses_count: number;

  student_state:
    | "active"
    | "expired"
    | "no_courses";

  total_count: number;
};

type Props = {
  students: Student[];

  query: string;
  status: StudentStatus;

  page: number;
  pageSize: number;

  totalCount: number;
  totalPages: number;
};

export default function AdminStudentsContent({
  students,
  query,
  status,
  page,
  pageSize,
  totalCount,
  totalPages,
}: Props) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  function buildPageHref(
    targetPage: number
  ) {
    const params =
      new URLSearchParams();

    if (query) {
      params.set(
        "q",
        query
      );
    }

    if (status !== "all") {
      params.set(
        "status",
        status
      );
    }

    if (targetPage > 1) {
      params.set(
        "page",
        String(
          targetPage
        )
      );
    }

    const queryString =
      params.toString();

    return `/admin/students${
      queryString
        ? `?${queryString}`
        : ""
    }`;
  }

  function stateLabel(
    state:
      | "active"
      | "expired"
      | "no_courses"
  ) {
    if (
      state === "active"
    ) {
      return isArabic
        ? "نشط"
        : "Active";
    }

    if (
      state === "expired"
    ) {
      return isArabic
        ? "منتهي"
        : "Expired";
    }

    return isArabic
      ? "بدون دورات"
      : "No courses";
  }

  function stateClasses(
    state:
      | "active"
      | "expired"
      | "no_courses"
  ) {
    if (
      state === "active"
    ) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    if (
      state === "expired"
    ) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    return "bg-slate-100 text-slate-600 border-slate-200";
  }

  const firstShown =
    totalCount === 0
      ? 0
      : (
          page - 1
        ) *
          pageSize +
        1;

  const lastShown =
    Math.min(
      page * pageSize,
      totalCount
    );

  return (
    <div
      className="max-w-7xl mx-auto w-full space-y-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <div className="bg-[var(--brand-surface)] rounded-2xl border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--brand-text)]">
              {
                t.admin
                  .studentsManagement
              }
            </h1>

            <p className="text-[var(--brand-text-muted)] mt-2">
              {
                t.admin
                  .studentsDescription
              }
            </p>
          </div>

          <div className="rounded-xl bg-[var(--brand-bg)] border px-5 py-3">
            <p className="text-xs text-[var(--brand-text-muted)]">
              {isArabic
                ? "عدد النتائج"
                : "Results"}
            </p>

            <p className="text-2xl font-bold text-[var(--brand-text)]">
              {totalCount}
            </p>
          </div>
        </div>
      </div>


      <form
        action="/admin/students"
        method="get"
        className="bg-[var(--brand-surface)] rounded-2xl border p-5"
      >
        <div className="grid lg:grid-cols-[1fr_230px_auto] gap-3">
          <input
            type="search"
            name="q"
            defaultValue={
              query
            }
            placeholder={
              isArabic
                ? "ابحث بالاسم أو الهاتف أو البريد الإلكتروني..."
                : "Search by name, phone or email..."
            }
            className="w-full rounded-xl border px-4 py-3 bg-white text-[var(--brand-text)]"
          />

          <select
            name="status"
            defaultValue={
              status
            }
            className="w-full rounded-xl border px-4 py-3 bg-white text-[var(--brand-text)]"
          >
            <option value="all">
              {isArabic
                ? "كل الطلاب"
                : "All students"}
            </option>

            <option value="active">
              {isArabic
                ? "نشط"
                : "Active"}
            </option>

            <option value="expired">
              {isArabic
                ? "اشتراك منتهي"
                : "Expired subscription"}
            </option>

            <option value="no_courses">
              {isArabic
                ? "بدون دورات"
                : "No courses"}
            </option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-[#087a54] px-6 py-3 font-bold text-white hover:opacity-90"
          >
            {isArabic
              ? "بحث وفلترة"
              : "Search"}
          </button>
        </div>

        {(query ||
          status !==
            "all") && (
          <div className="mt-3">
            <Link
              href="/admin/students"
              className="text-sm font-semibold underline text-[var(--brand-text-muted)]"
            >
              {isArabic
                ? "مسح البحث والفلاتر"
                : "Clear search and filters"}
            </Link>
          </div>
        )}
      </form>


      <div className="bg-[var(--brand-surface)] rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-start">
            <thead className="bg-[var(--brand-bg)]">
              <tr>
                <th className="p-4">
                  {
                    t.admin
                      .name
                  }
                </th>

                <th className="p-4">
                  {isArabic
                    ? "معلومات التواصل"
                    : "Contact"}
                </th>

                <th className="p-4">
                  {
                    t.admin
                      .coursesCount
                  }
                </th>

                <th className="p-4">
                  {isArabic
                    ? "الحالة"
                    : "Status"}
                </th>

                <th className="p-4">
                  {
                    t.admin
                      .registrationDate
                  }
                </th>

                <th className="p-4">
                  {
                    t.admin
                      .actions
                  }
                </th>
              </tr>
            </thead>

            <tbody>
              {students.length >
              0 ? (
                students.map(
                  (
                    student
                  ) => (
                    <tr
                      key={
                        student.id
                      }
                      className="border-t align-middle"
                    >
                      <td className="p-4">
                        <p className="font-bold text-[var(--brand-text)]">
                          {student.full_name ??
                            t
                              .admin
                              .noName}
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-[var(--brand-text)]">
                            {student.email ??
                              "—"}
                          </p>

                          <p className="text-[var(--brand-text-muted)]">
                            {student.phone ??
                              "—"}
                          </p>
                        </div>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-[var(--brand-text)]">
                          {
                            student.enrollments_count
                          }
                        </p>

                        {student.enrollments_count >
                          0 && (
                          <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                            {isArabic
                              ? `نشطة: ${student.active_courses_count} • منتهية: ${student.expired_courses_count}`
                              : `Active: ${student.active_courses_count} • Expired: ${student.expired_courses_count}`}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${stateClasses(
                            student.student_state
                          )}`}
                        >
                          {stateLabel(
                            student.student_state
                          )}
                        </span>
                      </td>

                      <td className="p-4 text-[var(--brand-text-muted)]">
                        {new Date(
                          student.created_at
                        ).toLocaleDateString(
                          isArabic
                            ? "ar"
                            : "en",
                          {
                            year:
                              "numeric",
                            month:
                              "short",
                            day:
                              "numeric",
                          }
                        )}
                      </td>

                      <td className="p-4">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="inline-block rounded-lg bg-[#087a54] px-4 py-2 text-sm font-bold text-white"
                        >
                          {
                            t.admin
                              .viewDetails
                          }
                        </Link>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="p-12 text-center text-[var(--brand-text-muted)]"
                  >
                    {isArabic
                      ? "لا يوجد طلاب مطابقون للبحث أو الفلتر."
                      : "No students match the current search or filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        <div className="border-t px-5 py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <p className="text-sm text-[var(--brand-text-muted)]">
            {isArabic
              ? `عرض ${firstShown} - ${lastShown} من ${totalCount}`
              : `Showing ${firstShown} - ${lastShown} of ${totalCount}`}
          </p>

          <div className="flex items-center gap-2">
            {page >
            1 ? (
              <Link
                href={buildPageHref(
                  page - 1
                )}
                className="rounded-lg border px-4 py-2 text-sm font-bold bg-white"
              >
                {isArabic
                  ? "السابق"
                  : "Previous"}
              </Link>
            ) : (
              <span className="rounded-lg border px-4 py-2 text-sm font-bold opacity-40">
                {isArabic
                  ? "السابق"
                  : "Previous"}
              </span>
            )}

            <span className="px-3 text-sm font-semibold text-[var(--brand-text)]">
              {isArabic
                ? `صفحة ${page} من ${totalPages}`
                : `Page ${page} of ${totalPages}`}
            </span>

            {page <
            totalPages ? (
              <Link
                href={buildPageHref(
                  page + 1
                )}
                className="rounded-lg border px-4 py-2 text-sm font-bold bg-white"
              >
                {isArabic
                  ? "التالي"
                  : "Next"}
              </Link>
            ) : (
              <span className="rounded-lg border px-4 py-2 text-sm font-bold opacity-40">
                {isArabic
                  ? "التالي"
                  : "Next"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
