"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

type Student = {
  id: string;
  full_name: string | null;
  created_at: string;
  enrollments: {
    id: string;
  }[] | null;
};

type Props = {
  students: Student[];
};

export default function AdminStudentsContent({
  students,
}: Props) {

  const { language } = useLanguage();

  const isArabic = language === "ar";


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <div className="bg-white rounded-2xl border p-6 text-right">

        <h1 className="text-2xl font-bold text-slate-800">
          {isArabic
            ? "إدارة الطلاب"
            : "Students Management"}
        </h1>

        <p className="text-slate-500 mt-2">
          {isArabic
            ? "عرض الطلاب والدورات المسجلين بها"
            : "View students and their enrolled courses"}
        </p>

      </div>


      <div className="bg-white rounded-2xl border overflow-hidden">

        <table className="w-full text-right">

          <thead className="bg-slate-50">

            <tr>

              <th className="p-4">
                {isArabic ? "الاسم" : "Name"}
              </th>

              <th className="p-4">
                {isArabic
                  ? "عدد الدورات"
                  : "Courses Count"}
              </th>

              <th className="p-4">
                {isArabic
                  ? "تاريخ التسجيل"
                  : "Registration Date"}
              </th>

              <th className="p-4">
                {isArabic
                  ? "الإجراءات"
                  : "Actions"}
              </th>

            </tr>

          </thead>


          <tbody>

            {students.map((student) => (

              <tr
                key={student.id}
                className="border-t"
              >

                <td className="p-4 font-bold">

                  {student.full_name ??
                    (isArabic
                      ? "بدون اسم"
                      : "No name")}

                </td>


                <td className="p-4">

                  {student.enrollments?.length ?? 0}

                </td>


                <td className="p-4 text-slate-500">

                  {new Date(
                    student.created_at
                  ).toLocaleDateString(
                    isArabic ? "ar" : "en"
                  )}

                </td>


                <td className="p-4">

                  <Link
                    href={`/admin/students/${student.id}`}
                    className="inline-block bg-[#087a54] text-white px-4 py-2 rounded-lg text-sm font-bold"
                  >

                    {isArabic
                      ? "عرض التفاصيل"
                      : "View Details"}

                  </Link>

                </td>


              </tr>

            ))}

          </tbody>


        </table>

      </div>


    </div>
  );
}
