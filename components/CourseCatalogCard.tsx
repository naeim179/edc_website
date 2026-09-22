"use client";

import Link from "next/link";
import CourseCover from "@/components/CourseCover";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ArrowIcon,
  BookIcon,
  CheckCircleIcon,
} from "@/components/icons";
import { formatLessons } from "@/lib/course-format";
import { computePrice } from "@/lib/course-pricing";

type CourseCatalogCardProps = {
  id: string;
  title: string;
  instructor?: string | null;
  category?: string | null;
  lessons: number;
  progress: number;
  image?: string | null;
  enrolled?: boolean;
  price?: number | null;
  currency?: string | null;
  isFree?: boolean | null;
  discountType?: "percentage" | "fixed" | null;
  discountValue?: number | null;
};

export default function CourseCatalogCard({
  id,
  title,
  instructor,
  category,
  lessons,
  progress,
  image,
  enrolled = false,
  price,
  currency,
  isFree,
  discountType,
  discountValue,
}: CourseCatalogCardProps) {
  const { language } = useLanguage();
  const isArabic = language === "ar";

  const pricing = computePrice({
    price,
    currency,
    isFree,
    discountType,
    discountValue,
  });

  const done = enrolled && progress >= 100;

  const label = enrolled
    ? done
      ? isArabic
        ? "مراجعة"
        : "Review"
      : isArabic
      ? "متابعة"
      : "Continue"
    : isArabic
    ? "عرض الدورة"
    : "View course";

  return (
    <article
      dir={isArabic ? "rtl" : "ltr"}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none"
    >
      <Link
        href={`/courses/${id}`}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[16/9] overflow-hidden"
      >
        <CourseCover image={image} title={title} />

        {category && (
          <span className="absolute start-3 top-3 rounded-full bg-[#ffffff]/90 px-3 py-1 text-xs font-bold text-[#124b8a] backdrop-blur">
            {category}
          </span>
        )}

        {enrolled && (
          <span
            className={`absolute end-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white ${
              done ? "bg-emerald-500" : "bg-[#124b8a]"
            }`}
          >
            {done && <CheckCircleIcon width={14} height={14} />}

            {done
              ? isArabic
                ? "مكتملة"
                : "Completed"
              : isArabic
              ? "مسجل"
              : "Enrolled"}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-7 text-slate-800">
          <Link
            href={`/courses/${id}`}
            className="transition-colors hover:text-[#124b8a]"
          >
            {title}
          </Link>
        </h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
          {instructor && (
            <span className="inline-flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#124b8a]">
                {instructor.charAt(0).toUpperCase()}
              </span>

              <span className="max-w-[10rem] truncate">
                {instructor}
              </span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <BookIcon width={14} height={14} />
            {formatLessons(lessons, isArabic)}
          </span>
        </div>

        {enrolled && (
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-slate-400">
                {isArabic ? "التقدم" : "Progress"}
              </span>

              <span
                className={`font-bold ${
                  done ? "text-emerald-600" : "text-[#124b8a]"
                }`}
              >
                {progress}%
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  done ? "bg-emerald-500" : "bg-[#124b8a]"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {enrolled ? (
            <span />
          ) : pricing.isFree ? (
            <span className="text-lg font-bold text-emerald-600">
              {isArabic ? "مجانية" : "Free"}
            </span>
          ) : (
            <div className="flex flex-col leading-tight">
              {pricing.hasDiscount && (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 line-through">
                    {pricing.original.toFixed(2)}
                  </span>

                  <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600">
                    {isArabic
                      ? `خصم ${pricing.discountPercent}%`
                      : `${pricing.discountPercent}% off`}
                  </span>
                </span>
              )}

              <div className="text-end">
                <p className="text-lg font-bold text-slate-900">
                  {pricing.final.toFixed(2)}{" "}
                  <span className="text-xs font-semibold text-slate-500">
                    USD
                  </span>
                </p>

              </div>
            </div>
          )}

          <Link
            href={`/courses/${id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#124b8a] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0d3b6e]"
          >
            {label}
            <ArrowIcon
              width={16}
              height={16}
              className="rtl:rotate-180"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
