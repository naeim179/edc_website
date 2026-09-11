"use client";

import { useLanguage } from "@/components/LanguageProvider";

type Order = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  courses: {
    title?: string;
  }[];
};

type Props = {
  orders: Order[];
};

export default function AdminOrdersContent({
  orders,
}: Props) {

  const { language } = useLanguage();

  const isArabic = language === "ar";


  return (
    <div
      className="max-w-6xl mx-auto w-full space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >

      <div className="bg-white rounded-2xl border p-6 text-right">

        <h1 className="text-2xl font-bold">
          {isArabic ? "الطلبات" : "Orders"}
        </h1>

        <p className="text-slate-500 mt-2">
          {isArabic
            ? "متابعة عمليات الشراء"
            : "Track purchase operations"}
        </p>

      </div>


      <div className="space-y-4">

        {orders.length > 0 ? (

          orders.map((order) => {

            const courseTitle =
              order.courses?.[0]?.title ??
              (isArabic
                ? "دورة غير موجودة"
                : "Course not found");


            return (

              <div
                key={order.id}
                className="bg-white rounded-xl border p-5 text-right"
              >

                <h2 className="font-bold">
                  {courseTitle}
                </h2>


                <p className="text-sm text-slate-500 mt-2">
                  {isArabic
                    ? "المبلغ"
                    : "Amount"}
                  : {order.amount} {order.currency}
                </p>


                <p className="text-sm mt-1">
                  {isArabic
                    ? "الحالة"
                    : "Status"}
                  : {order.status}
                </p>


              </div>

            );

          })

        ) : (

          <div className="bg-white border rounded-xl p-6 text-right">

            {isArabic
              ? "لا توجد طلبات"
              : "No orders found"}

          </div>

        )}

      </div>


    </div>
  );
}
