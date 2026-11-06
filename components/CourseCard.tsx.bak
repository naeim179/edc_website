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
  CheckCircleIcon,
} from "@/components/icons";

type CourseCardProps = {
  id: string;
  title: string;
  category?: string | null;

  progress: number;
  completedLessons: number;
  totalLessons: number;

  image?: string | null;

  nextLessonId?: string | null;

  enrolled?: boolean;

  isFree?: boolean;

  accessActive?: boolean;

  expiresAt?: string | null;

  daysRemaining?: number | null;

  autoRenew?: boolean;
};

export default function CourseCard({
  id,
  title,
  category,
  progress,
  completedLessons,
  totalLessons,
  image,
  enrolled = true,
  isFree = false,
  accessActive = true,
  expiresAt = null,
  daysRemaining = null,
  autoRenew = false,
}: CourseCardProps) {
  const { language } = useLanguage();

  const isArabic = language === "ar";

  const expired =
    enrolled &&
    !isFree &&
    !accessActive;

  const done =
    enrolled &&
    accessActive &&
    progress >= 100;

  const href = expired
    ? `/checkout/${id}`
    : `/courses/${id}`;

  const label =
    !enrolled
      ? isArabic
        ? "عرض الدورة"
        : "View course"
      : expired
        ? isArabic
          ? "تجديد الاشتراك"
          : "Renew subscription"
        : done
          ? isArabic
            ? "مراجعة الدورة"
            : "Review course"
          : progress > 0
            ? isArabic
              ? "متابعة التعلم"
              : "Continue learning"
            : isArabic
              ? "ابدأ الدورة"
              : "Start course";

  return (
    <Card
      className="
        group
        overflow-hidden
      "
    >
      <Link
        href={`/courses/${id}`}
        className="relative block aspect-[16/9] overflow-hidden"
      >
        <CourseCover
          image={image}
          title={title}
        />

        {category && (
          <Badge
            variant="info"
            className="absolute start-3 top-3 bg-white/90 backdrop-blur"
          >
            {category}
          </Badge>
        )}

        {done && (
          <span className="absolute end-3 top-3">
            <Badge variant="success">
              <span className="flex items-center gap-1">
                <CheckCircleIcon
                  width={14}
                  height={14}
                />
                {isArabic
                  ? "مكتملة"
                  : "Completed"}
              </span>
            </Badge>
          </span>
        )}

        {expired && (
          <span className="absolute end-3 top-3">
            <Badge variant="danger">
              {isArabic
                ? "الاشتراك منتهي"
                : "Expired"}
            </Badge>
          </span>
        )}
      </Link>

      <CardContent
        className="
          flex
          flex-col
          gap-4
        "
      >
        <h3 className="line-clamp-2 text-lg font-semibold leading-7 text-slate-900">
          <Link
            href={`/courses/${id}`}
            className="transition-colors hover:text-[#124b8a]"
          >
            {title}
          </Link>
        </h3>

        {enrolled && (
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-slate-500">
                {isArabic
                  ? `${completedLessons} من ${totalLessons} درس مكتمل`
                  : `${completedLessons} of ${totalLessons} lessons completed`}
              </span>

              <span className="font-semibold text-[#124b8a]">
                {progress}%
              </span>
            </div>

            <ProgressBar value={progress} />
          </div>
        )}

        {enrolled && !isFree && (
          <div
            className={`
              rounded-xl
              px-3
              py-2
              text-xs
              ${
                expired
                  ? "bg-red-50 text-red-700"
                  : "bg-blue-50 text-[#124b8a]"
              }
            `}
          >
            {expiresAt ? (
              expired ? (
                <span className="font-semibold">
                  {isArabic
                    ? "انتهت صلاحية الاشتراك. تقدمك محفوظ."
                    : "Subscription expired. Your progress is saved."}
                </span>
              ) : (
                <>
                  {isArabic
                    ? `متبقي تقريبًا ${daysRemaining ?? 0} يوم`
                    : `About ${daysRemaining ?? 0} days remaining`}

                  {autoRenew && (
                    <span className="ms-2 font-semibold">
                      · {isArabic
                        ? "تجديد تلقائي"
                        : "Auto renew"}
                    </span>
                  )}
                </>
              )
            ) : (
              <span>
                {isArabic
                  ? "الوصول الحالي بدون تاريخ انتهاء"
                  : "Current access has no expiration date"}
              </span>
            )}
          </div>
        )}

        <Link
          href={href}
          className={`
            mt-auto
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-xl
            px-4
            py-3
            text-sm
            font-semibold
            text-white
            transition-colors
            ${
              expired
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#124b8a] hover:bg-[#0d3b6e]"
            }
          `}
        >
          {label}

          <ArrowIcon
            width={16}
            height={16}
            className="rtl:rotate-180"
          />
        </Link>
      </CardContent>
    </Card>
  );
}
