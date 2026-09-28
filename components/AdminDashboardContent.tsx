"use client";

import { useLanguage } from "@/components/LanguageProvider";

type Card = {
  title: string;
  value: number;
  description: string;
  icon: string;
};

type AdminDashboardContentProps = {
  coursesCount: number;
  studentsCount: number;
  enrollmentsCount: number;
  ordersCount: number;
  paidOrdersCount: number;
  failedOrdersCount: number;
};

export default function AdminDashboardContent({
  coursesCount,
  studentsCount,
  enrollmentsCount,
  ordersCount,
  paidOrdersCount,
  failedOrdersCount,
}: AdminDashboardContentProps) {
  const { language, t } = useLanguage();

  const isArabic = language === "ar";

  const cards: Card[] = [
    {
      title: t.admin.courses,
      value: coursesCount,
      description: t.admin.totalCourses,
      icon: "📚",
    },
    {
      title: t.admin.students,
      value: studentsCount,
      description: t.admin.registeredStudents,
      icon: "👨‍🎓",
    },
    {
      title: t.admin.enrollments,
      value: enrollmentsCount,
      description: t.admin.courseEnrollments,
      icon: "📝",
    },
    {
      title: t.admin.payments,
      value: ordersCount,
      description: `${paidOrdersCount} ${t.admin.successful} - ${failedOrdersCount} ${t.admin.failed}`,
      icon: "💳",
    },
  ];

  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">
          {t.admin.dashboard}
        </h1>

        <p className="mt-3 text-blue-100">
          {t.admin.dashboardDescription}
        </p>
      </section>


      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5"
          >
            <div className="flex justify-between items-center">
              <span className="text-3xl">
                {card.icon}
              </span>

              <div className="text-right">
                <p className="text-sm text-slate-500">
                  {card.title}
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {card.value}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              {card.description}
            </p>
          </div>
        ))}
      </section>


      <section className="bg-white rounded-[26px] border border-slate-100 shadow-sm p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {t.admin.quickManagement}
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            [
              t.admin.manageCourses,
              t.admin.manageCoursesDescription,
            ],
            [
              t.admin.students,
              t.admin.manageStudentsDescription,
            ],
            [
              t.admin.payments,
              t.admin.managePaymentsDescription,
            ],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="bg-slate-50 rounded-xl p-4 text-right"
            >
              <p className="font-bold text-slate-700">
                {title}
              </p>

              <p className="text-sm text-slate-500 mt-1">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
