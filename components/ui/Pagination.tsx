"use client";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { pageHref, type PageInfo } from "@/lib/list-pages";

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pathname,
  query,
}: PageInfo & { pathname: string; query: Record<string, string> }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const number = (n: number) => n.toLocaleString(ar ? "ar-JO" : "en-US");
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => start + i,
  );
  const cls =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border px-3 py-2";
  return (
    <nav
      aria-label={ar ? "صفحات النتائج" : "Results pages"}
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-[var(--brand-surface)] p-4"
    >
      <p className="text-sm text-[var(--brand-text-muted)]" role="status">
        {ar ? "عرض" : "Showing"} {number(total ? (page - 1) * pageSize + 1 : 0)}
        –{number(Math.min(total, page * pageSize))} {ar ? "من" : "of"}{" "}
        {number(total)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link
            prefetch={false}
            href={pageHref(pathname, query, page - 1)}
            className={cls}
          >
            {ar ? "السابق" : "Previous"}
          </Link>
        ) : (
          <span aria-disabled="true" className={`${cls} opacity-50`}>
            {ar ? "السابق" : "Previous"}
          </span>
        )}
        {pages.map((n) => (
          <Link
            prefetch={false}
            key={n}
            href={pageHref(pathname, query, n)}
            aria-label={`${ar ? "صفحة" : "Page"} ${number(n)}`}
            aria-current={n === page ? "page" : undefined}
            className={`${cls} ${n === page ? "bg-[var(--brand-ink)] text-[var(--brand-on-ink)] font-bold" : ""}`}
          >
            {number(n)}
          </Link>
        ))}
        {page < totalPages ? (
          <Link
            prefetch={false}
            href={pageHref(pathname, query, page + 1)}
            className={cls}
          >
            {ar ? "التالي" : "Next"}
          </Link>
        ) : (
          <span aria-disabled="true" className={`${cls} opacity-50`}>
            {ar ? "التالي" : "Next"}
          </span>
        )}
      </div>
    </nav>
  );
}
