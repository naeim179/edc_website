"use client";

import Image from "next/image";
import Link from "next/link";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";

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

  const sections =
    course.sections?.length ?? 0;

  const lessons =
    course.sections?.reduce(
      (total, section) =>
        total + section.lessons.length,
      0
    ) ?? 0;

  const students =
    course.enrollments?.length ?? 0;

  const teacher =
    course.course_instructors?.[0]?.teacher?.[0]?.full_name ?? "No Teacher";


  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-lg transition">

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
            No Image
          </div>
        )}

      </div>


      <div className="p-5 space-y-4">

        <div>
          <h2 className="font-bold text-lg">
            {course.title}
          </h2>

          <p className="text-sm text-slate-500">
            {course.category ?? "No Category"}
          </p>
        </div>


        <div className="text-sm space-y-1">

          <p>
            👨‍🏫 <b>Teacher:</b> {teacher}
          </p>

          <p>
            👥 <b>Students:</b> {students}
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
            {course.course_type === "private"
              ? "Private"
              : "Group"}
          </span>


          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              course.is_published
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-600"
            }`}
          >
            {course.is_published
              ? "Published"
              : "Draft"}
          </span>

        </div>


        <div className="grid grid-cols-3 gap-2 text-xs">

          <div className="bg-slate-50 rounded-xl p-3 text-center">
            📚
            <br />
            {sections}
            <br />
            Sections
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center">
            🎬
            <br />
            {lessons}
            <br />
            Lessons
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-center">
            👥
            <br />
            {students}
            <br />
            Students
          </div>

        </div>


        <div className="font-bold text-[#087a54]">

          {course.is_free
            ? "Free"
            : `${course.price ?? 0} ${course.currency ?? "USD"}`}

        </div>


        <div className="grid grid-cols-2 gap-2">

          <Link
            href={`/admin/courses/${course.id}/edit`}
            className="rounded-xl bg-slate-100 py-2 text-center font-bold text-sm"
          >
            Edit
          </Link>


          <Link
            href={`/admin/courses/${course.id}/sections`}
            className="rounded-xl bg-emerald-50 text-emerald-700 py-2 text-center font-bold text-sm"
          >
            Content
          </Link>

        </div>


        <DeleteCourseButton id={course.id} />

      </div>

    </div>
  );
}
