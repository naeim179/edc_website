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
  pendingOrdersCount: number;
};

export default function AdminDashboardContent({
  coursesCount,
  studentsCount,
  enrollmentsCount,
  ordersCount,
  pendingOrdersCount,
}: AdminDashboardContentProps) {

  const { language } = useLanguage();

  const isArabic = language === "ar";


  const cards: Card[] = [
    {
      title: isArabic ? "الدورات" : "Courses",
      value: coursesCount,
      description: isArabic
        ? "إجمالي الدورات التعليمية"
        : "Total educational courses",
      icon: "📚",
    },
    {
      title: isArabic ? "الطلاب" : "Students",
      value: studentsCount,
      description: isArabic
        ? "عدد الطلاب المسجلين"
        : "Registered students",
      icon: "👨‍🎓",
    },
    {
      title: isArabic ? "التسجيلات" : "Enrollments",
      value: enrollmentsCount,
      description: isArabic
        ? "عدد التسجيلات بالدورات"
        : "Course enrollments",
      icon: "📝",
    },
    {
      title: isArabic ? "الطلبات" : "Orders",
      value: ordersCount,
      description: isArabic
        ? `طلبات الشراء - ${pendingOrdersCount} بانتظار المراجعة`
        : `Purchase orders - ${pendingOrdersCount} pending`,
      icon: pendingOrdersCount > 0 ? "🔴💳" : "💳",
    },
  ];


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <section className="bg-gradient-to-l from-[#124b8a] to-[#1f5aa6] rounded-[28px] text-white p-8 shadow-sm">

        <h1 className="text-3xl font-bold">
          {isArabic ? "لوحة التحكم" : "Dashboard"}
        </h1>

        <p className="mt-3 text-blue-100">
          {isArabic
            ? "إدارة منصة Your Way ومتابعة أداء الطلاب والدورات."
            : "Manage Your Way platform and track student and course performance."}
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
          {isArabic ? "الإدارة السريعة" : "Quick Management"}
        </h2>


        <div className="grid md:grid-cols-3 gap-4">

          {[
            [
              isArabic ? "إدارة الدورات" : "Manage Courses",
              isArabic
                ? "إضافة وتعديل محتوى الدورات"
                : "Add and edit course content",
            ],
            [
              isArabic ? "الطلاب" : "Students",
              isArabic
                ? "متابعة الطلاب والتسجيلات"
                : "Track students and enrollments",
            ],
            [
              isArabic ? "الطلبات" : "Orders",
              isArabic
                ? "مراجعة عمليات الشراء"
                : "Review purchases",
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
