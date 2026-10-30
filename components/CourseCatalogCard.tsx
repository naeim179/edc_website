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

  const { language, t } = useLanguage();

  const isArabic = language === "ar";


  const pricing = computePrice({
    price,
    currency,
    isFree,
    discountType,
    discountValue,
  });


  const completed =
    enrolled && progress >= 100;

  const hasLessons = lessons > 0;


  const actionText =
    enrolled
      ? completed
        ? isArabic
          ? "مراجعة الدورة"
          : "Review Course"
        : isArabic
          ? "متابعة التعلم"
          : "Continue Learning"
      : isArabic
        ? "عرض الدورة"
        : "View Course";


  return (

    <Card
      className="
        group
        flex
        h-full
        flex-col
        overflow-hidden
        transition
        hover:-translate-y-1
        hover:shadow-2xl
        hover:border-[var(--brand-ink)]
      "
      dir={isArabic ? "rtl" : "ltr"}
    >


      <Link
        href={`/courses/${id}`}
        className="relative block aspect-video shrink-0 overflow-hidden"
      >

        <CourseCover
          image={image}
          title={title}
          showTitle={false}
        />


        <div className="absolute top-3 start-3 flex gap-2">

          {deliveryType && (
            <Badge variant="warning">
              {deliveryType === "live"
                ? isArabic
                  ? "مباشر"
                  : "Live"
                : isArabic
                  ? "فيديو مسجل"
                  : "Recorded"}
            </Badge>
          )}


          {enrolled && (
            <Badge variant={completed ? "success" : "info"}>

              <span className="flex items-center gap-1">

                {completed && (
                  <CheckCircleIcon
                    width={14}
                    height={14}
                  />
                )}

                {completed
                  ? isArabic
                    ? "مكتملة"
                    : "Completed"
                  : isArabic
                    ? "مسجل"
                    : "Enrolled"}

              </span>

            </Badge>
          )}


          {(pricing.isFree || pricing.final <= 0) && (
            <Badge variant="success">
              {isArabic ? "مجاني" : "Free"}
            </Badge>
          )}

        </div>

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
          <Badge className="self-start">
            {category}
          </Badge>
        )}



        <h3 className="
          text-lg
          font-bold
          line-clamp-2
          text-[var(--brand-text)]
        ">
          {title}
        </h3>



        {instructor && (

          <div className="flex items-center gap-2 text-sm">

            <span className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-full
              bg-[var(--brand-bg)]
              font-bold
              text-[var(--brand-ink)]
            ">
              {instructor.charAt(0)}
            </span>


            <span>
              {instructor}
            </span>

          </div>

        )}




        <div className="
          flex
          items-center
          justify-between
          text-sm
          text-[var(--brand-text-muted)]
        ">

          <span className="flex items-center gap-1">
            <BookIcon width={15} height={15}/>
            {formatLessons(lessons,isArabic)}
          </span>


          {enrolled && hasLessons && (
            <span className="font-bold">
              {progress}%
            </span>
          )}

        </div>




        {enrolled && hasLessons && (

          <ProgressBar
            value={progress}
          />

        )}




        <div className="
          mt-auto
          border-t
          border-[var(--brand-border)]
          pt-4
          flex
          items-center
          justify-between
        ">


          <div>

            {enrolled ? null : (pricing.isFree || pricing.final <= 0) ? (

              <span className="
                text-lg
                font-bold
                text-[var(--brand-ink)]
              ">
                {t.courses.free}
              </span>

            ) : (

              <>


                {pricing.hasDiscount && (
                  <div className="text-xs line-through">
                    ≈ {(pricing.original * 3.75).toFixed(2)} SAR
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <span className="text-lg font-bold">
                    ≈ {(pricing.final * 3.75).toFixed(2)} SAR
                  </span>

                  <span className="text-xs text-[var(--brand-text-muted)]">
                    {isArabic ? "الدفع الفعلي:" : "Charged:"}{" "}
                    {pricing.final.toFixed(2)} USD
                  </span>
                </div>

              </>

            )}

          </div>



          <Link
            href={`/courses/${id}`}
            className={`
              rounded-xl
              bg-[var(--brand-ink)]
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              flex
              items-center
              gap-2
              ${enrolled ? "w-full justify-center" : ""}
            `}
          >

            {actionText}

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
