"use client";

import Image from "next/image";
import Link from "next/link";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";
import { useLanguage } from "@/components/LanguageProvider";

type Course = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  price: number | null;
  currency: string | null;
  is_free: boolean | null;
  course_type: "group" | "private" | null;
  is_published: boolean | null;
  created_at: string;

  sections: {
    id: string;
    lessons: {
      id: string;
    }[];
  }[] | null;

  enrollments: {
    id: string;
  }[] | null;

  course_instructors: {
    teacher_id: string;
    teacher: {
      full_name: string | null;
    }[] | null;
  }[] | null;
};

export default function AdminCourseCard({
  course,
}: {
  course: Course;
}) {

  const { t } = useLanguage();

  const sections = course.sections?.length ?? 0;

  const lessons =
    course.sections?.reduce(
      (total, section) =>
        total + section.lessons.length,
      0
    ) ?? 0;

  const students =
    course.enrollments?.length ?? 0;

  const teacher =
    course.course_instructors?.[0]?.teacher?.[0]?.full_name ??
    "No Teacher";


  const date =
    new Date(course.created_at).toLocaleDateString();


  return (
    <div className="
      bg-white
      rounded-3xl
      border
      shadow-sm
      overflow-hidden
      hover:shadow-xl
      transition
    ">

      <div className="relative h-44 bg-slate-100">

        {course.image_url ? (
          <Image
            src={course.image_url}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 font-bold">
            {t.admin.noImage ?? "No Image"}
          </div>
        )}


        <div className="absolute top-3 left-3 flex gap-2">

          <span className="
            bg-white/90
            px-3
            py-1
            rounded-full
            text-xs
            font-bold
          ">
            {course.is_published
              ? t.admin.published
              : t.admin.draft}
          </span>

        </div>

      </div>



      <div className="p-5 space-y-4">


        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {course.title}
          </h2>

          <p className="text-sm text-slate-500">
            {course.category ?? t.admin.noCategory}
          </p>
        </div>



        <div className="grid grid-cols-2 gap-2 text-sm">

          <div className="bg-slate-50 rounded-xl p-3">
            👨‍🏫
            <br />
            {teacher}
          </div>


          <div className="bg-slate-50 rounded-xl p-3">
            👥
            <br />
            {students} {t.admin.students}
          </div>

        </div>



        <div className="flex flex-wrap gap-2">

          <span className="
            bg-blue-50
            text-blue-700
            px-3
            py-1
            rounded-full
            text-xs
            font-bold
          ">
            {course.course_type === "private"
              ? t.admin.private
              : t.admin.group}
          </span>


          <span className="
            bg-emerald-50
            text-emerald-700
            px-3
            py-1
            rounded-full
            text-xs
            font-bold
          ">
            {course.is_free
              ? "Free"
              : `${course.price ?? 0} ${course.currency ?? "USD"}`}
          </span>

        </div>



        <div className="grid grid-cols-3 gap-2">

          <div className="bg-slate-50 rounded-xl p-3 text-center text-xs">
            📚
            <br />
            {sections}
            <br />
            {t.admin.section}
          </div>


          <div className="bg-slate-50 rounded-xl p-3 text-center text-xs">
            🎬
            <br />
            {lessons}
            <br />
            {t.admin.lessons}
          </div>


          <div className="bg-slate-50 rounded-xl p-3 text-center text-xs">
            📅
            <br />
            {date}
          </div>

        </div>



        <div className="grid grid-cols-2 gap-2">

          <Link
            href={`/admin/courses/${course.id}/edit`}
            className="
              rounded-xl
              bg-slate-100
              py-2
              text-center
              font-bold
              text-sm
            "
          >
            {t.admin.edit}
          </Link>


          <Link
            href={`/admin/courses/${course.id}/sections`}
            className="
              rounded-xl
              bg-emerald-50
              text-emerald-700
              py-2
              text-center
              font-bold
              text-sm
            "
          >
            {t.admin.content}
          </Link>


          <Link
            href={`/courses/${course.id}`}
            target="_blank"
            className="
              col-span-2
              rounded-xl
              bg-blue-50
              text-blue-700
              py-2
              text-center
              font-bold
              text-sm
            "
          >
            View as Student
          </Link>

        </div>


        <DeleteCourseButton id={course.id} />

      </div>

    </div>
  );
}
