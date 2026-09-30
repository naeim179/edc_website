"use client";

import Link from "next/link";
import AdminCourseCard from "@/components/admin/AdminCourseCard";
import { useLanguage } from "@/components/LanguageProvider";
import { useMemo, useState } from "react";

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

type Props = {
  courses: Course[];
};

export default function AdminCoursesContent({
  courses,
}: Props) {

  const { language, t } = useLanguage();
  const isArabic = language === "ar";


  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "published" | "draft"
  >("all");


  const [courseTypeFilter, setCourseTypeFilter] = useState<
    "all" | "group" | "private"
  >("all");


  const [sort, setSort] = useState<
    "latest" | "students" | "lessons"
  >("latest");


  const filteredCourses = useMemo(() => {

    const result = courses.filter((course) => {

      const matchesSearch =
        course.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (course.category ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());


      const matchesFilter =
        filter === "all"
          ? true
          : filter === "published"
            ? course.is_published
            : !course.is_published;


      const matchesType =
        courseTypeFilter === "all"
          ? true
          : course.course_type === courseTypeFilter;


      return (
        matchesSearch &&
        matchesFilter &&
        matchesType
      );

    });


    return result.sort((a, b) => {

      if (sort === "students") {
        return (
          (b.enrollments?.length ?? 0) -
          (a.enrollments?.length ?? 0)
        );
      }


      if (sort === "lessons") {

        const aLessons =
          a.sections?.reduce(
            (sum, section) =>
              sum + section.lessons.length,
            0
          ) ?? 0;


        const bLessons =
          b.sections?.reduce(
            (sum, section) =>
              sum + section.lessons.length,
            0
          ) ?? 0;


        return bLessons - aLessons;
      }


      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );

    });

  }, [
    courses,
    search,
    filter,
    courseTypeFilter,
    sort
  ]);


  const totalCourses = courses.length;

  const publishedCourses =
    courses.filter((course) => course.is_published).length;

  const draftCourses =
    courses.filter((course) => !course.is_published).length;

  const totalStudents =
    courses.reduce(
      (sum, course) =>
        sum + (course.enrollments?.length ?? 0),
      0
    );

  const totalLessons =
    courses.reduce(
      (sum, course) =>
        sum +
        (course.sections?.reduce(
          (s, section) =>
            s + section.lessons.length,
          0
        ) ?? 0),
      0
    );


  return (
    <div
      className="max-w-7xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-white rounded-2xl border p-5">
          <div className="text-2xl font-bold">
            {totalCourses}
          </div>
          <div className="text-sm text-slate-500">
            {isArabic ? "كل الدورات" : "Total Courses"}
          </div>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <div className="text-2xl font-bold text-emerald-600">
            {publishedCourses}
          </div>
          <div className="text-sm text-slate-500">
            {isArabic ? "منشورة" : "Published"}
          </div>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <div className="text-2xl font-bold text-slate-600">
            {draftCourses}
          </div>
          <div className="text-sm text-slate-500">
            {isArabic ? "مسودات" : "Drafts"}
          </div>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <div className="text-2xl font-bold text-blue-600">
            {totalStudents}
          </div>
          <div className="text-sm text-slate-500">
            {isArabic ? "الطلاب" : "Students"}
          </div>
        </div>

      </div>


      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">

        <div className="flex items-center justify-between gap-4">

          <Link
            href="/admin/courses/new"
            className="bg-white text-[#124b8a] px-5 py-3 rounded-xl font-bold"
          >
            + {t.admin.addCourseButton}
          </Link>


          <div>
            <h1 className="text-3xl font-bold">
              {t.admin.manageCourses}
            </h1>

            <p className="mt-2 text-blue-100">
              {t.admin.manageCoursesText}
            </p>
          </div>

        </div>

      </section>


      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Courses</p>
          <p className="text-2xl font-bold">
            {totalCourses}
          </p>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Published</p>
          <p className="text-2xl font-bold text-emerald-600">
            {publishedCourses}
          </p>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Draft</p>
          <p className="text-2xl font-bold text-slate-600">
            {draftCourses}
          </p>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Students</p>
          <p className="text-2xl font-bold text-blue-600">
            {totalStudents}
          </p>
        </div>


        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Lessons</p>
          <p className="text-2xl font-bold text-purple-600">
            {totalLessons}
          </p>
        </div>

      </div>


      <div className="bg-white rounded-2xl border p-5 flex flex-col md:flex-row gap-4">

        <input
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          placeholder="Search courses..."
          className="flex-1 border rounded-xl px-4 py-3"
        />


        <select
          value={filter}
          onChange={(e)=>setFilter(e.target.value as any)}
          className="border rounded-xl px-4 py-3"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>


        <select
          value={courseTypeFilter}
          onChange={(e)=>setCourseTypeFilter(e.target.value as any)}
          className="border rounded-xl px-4 py-3"
        >
          <option value="all">All Types</option>
          <option value="group">Group</option>
          <option value="private">Private</option>
        </select>

      </div>


      <div className="flex justify-end">

        <select
          value={sort}
          onChange={(e)=>setSort(e.target.value as any)}
          className="border rounded-xl px-4 py-3 bg-white"
        >
          <option value="latest">
            Latest
          </option>

          <option value="students">
            Most Students
          </option>

          <option value="lessons">
            Most Lessons
          </option>

        </select>

      </div>


      {filteredCourses.length ? (

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredCourses.map((course) => (
            <AdminCourseCard
              key={course.id}
              course={course}
            />
          ))}

        </div>

      ) : (

        <div className="bg-white rounded-2xl p-10 text-center border">
          {t.admin.noCoursesAvailable}
        </div>

      )}

    </div>
  );
}
