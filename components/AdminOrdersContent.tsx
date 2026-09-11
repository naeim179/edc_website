"use client";

import { useTransition } from "react";
import { approveOrder } from "@/app/actions/admin-orders";
import { useLanguage } from "@/components/LanguageProvider";


type Order = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  user_id: string;
  created_at: string;
  student?: string;
  studentName?: string;
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

  const [pending, startTransition] =
    useTransition();


  function handleApprove(orderId: string) {

    startTransition(async () => {

      await approveOrder(orderId);

      window.location.reload();

    });

  }


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
                    ? "الطالب"
                    : "Student"}
                  : {order.student ?? "Unknown"}
                </p>


                <p className="text-xs text-slate-400 mt-1 break-all">
                  User ID: {order.user_id}
                </p>


                <p className="text-sm text-slate-500 mt-2">
                  {isArabic
                    ? "الطالب"
                    : "Student"}
                  : {order.studentName}
                </p>


                <p className="text-sm text-slate-400 mt-1">
                  User ID: {order.user_id}
                </p>


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


                <p className="text-xs text-slate-400 mt-1">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>


                {order.status === "pending" && (

                  <button
                    disabled={pending}
                    onClick={() =>
                      handleApprove(order.id)
                    }
                    className="mt-4 bg-green-600 text-white px-5 py-2 rounded-xl font-bold disabled:opacity-50"
                  >
                    {pending
                      ? "..."
                      : isArabic
                        ? "تأكيد الدفع"
                        : "Approve Payment"}
                  </button>

                )}


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
