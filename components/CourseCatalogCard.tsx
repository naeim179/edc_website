"use client";

import Link from "next/link";

import CourseCover from "@/components/CourseCover";
import { useLanguage } from "@/components/LanguageProvider";

import Card from "@/components/ui/Card";
import CardContent from "@/components/ui/CardContent";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";

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
  deliveryType?: "recorded" | "live";
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
  deliveryType,
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
    <Card
      className="
        group
        overflow-hidden
        hover:-translate-y-1
      "
      dir={isArabic ? "rtl" : "ltr"}
    >
      <Link
        href={`/courses/${id}`}
        className="relative block aspect-[16/9] overflow-hidden"
      >
        <CourseCover
          image={image}
          title={title}
        />

        {deliveryType && (
          <span className="absolute start-3 top-3">
            <Badge variant="warning">
              {deliveryType === "live"
                ? isArabic
                  ? "دورة مباشرة"
                  : "Live"
                : isArabic
                ? "دورة مسجلة"
                : "Recorded"}
            </Badge>
          </span>
        )}

        {enrolled && (
          <span className="absolute end-3 top-3">
            <Badge variant={done ? "success" : "info"}>
              <span className="flex items-center gap-1">
                {done && (
                  <CheckCircleIcon
                    width={14}
                    height={14}
                  />
                )}

                {done
                  ? isArabic
                    ? "مكتملة"
                    : "Completed"
                  : isArabic
                  ? "مسجل"
                  : "Enrolled"}
              </span>
            </Badge>
          </span>
        )}
      </Link>

      <CardContent
        className="
          flex
          flex-1
          flex-col
          gap-4
        "
      >
        {category && (
          <Badge variant="default">
            {category}
          </Badge>
        )}

        <h3 className="line-clamp-2 text-lg font-semibold text-slate-900">
          <Link
            href={`/courses/${id}`}
            className="hover:text-[#124b8a]"
          >
            {title}
          </Link>
        </h3>

        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          {instructor && (
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#124b8a]">
                {instructor.charAt(0).toUpperCase()}
              </span>

              {instructor}
            </span>
          )}

          <span className="flex items-center gap-1">
            <BookIcon width={14} height={14} />
            {formatLessons(lessons, isArabic)}
          </span>
        </div>

        {enrolled && (
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-slate-500">
                {isArabic ? "التقدم" : "Progress"}
              </span>

              <span className="font-semibold text-[#124b8a]">
                {progress}%
              </span>
            </div>

            <ProgressBar value={progress} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          {enrolled ? (
            <span />
          ) : pricing.isFree ? (
            <span className="text-lg font-bold text-emerald-600">
              {isArabic ? "مجانية" : "Free"}
            </span>
          ) : (
            <div>
              {pricing.hasDiscount && (
                <div className="flex gap-2 text-xs">
                  <span className="line-through text-slate-400">
                    {pricing.original.toFixed(2)}
                  </span>

                  <Badge variant="danger">
                    {pricing.discountPercent}%
                  </Badge>
                </div>
              )}

              <p className="text-lg font-bold text-slate-900">
                {pricing.final.toFixed(2)} USD
              </p>
            </div>
          )}

          <Link
            href={`/courses/${id}`}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#124b8a]
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              hover:bg-[#0d3b6e]
            "
          >
            {label}

            <ArrowIcon
              width={16}
              height={16}
              className="rtl:rotate-180"
            />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
