import Link from "next/link";
import { fulfillPaymentByTranRef } from "@/lib/payments";

type SearchParams = {
  tranRef?: string;
  course?: string;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params =
    await searchParams;

  let paid = false;

  let courseId:
    string | null =
    params.course ?? null;

  let expiresAt:
    string | null = null;

  let autoRenew = false;

  if (params.tranRef) {
    for (
      let attempt = 0;
      attempt < 5;
      attempt++
    ) {
      try {
        const result =
          await fulfillPaymentByTranRef(
            params.tranRef
          );

        if (result.paid) {
          paid = true;

          courseId =
            result.courseId;

          expiresAt =
            result.expiresAt;

          autoRenew =
            result.autoRenew;

          break;
        }
      } catch {
        // قد تكون العملية ما زالت قيد المعالجة
      }

      if (attempt < 4) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              1000
            )
        );
      }
    }
  }

  return (
    <div
      className="max-w-lg mx-auto mt-20 text-center bg-white border rounded-[26px] p-8 shadow-sm"
      dir="rtl"
    >
      {paid ? (
        <>
          <h1 className="text-2xl font-bold text-[#087a54] mb-4">
            تم الدفع وتفعيل الاشتراك
          </h1>

          <p className="text-slate-500 mb-4">
            تم تسجيلك بالدورة بنجاح.
          </p>

          {expiresAt && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-500">
                الاشتراك صالح حتى
              </p>

              <p className="font-bold text-slate-800 mt-1">
                {new Date(
                  expiresAt
                ).toLocaleDateString(
                  "ar-JO"
                )}
              </p>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-6">
            {autoRenew
              ? "التجديد التلقائي مفعّل لهذا الاشتراك."
              : "التجديد يدوي. يمكنك تجديد الاشتراك لاحقًا."}
          </p>

          {courseId && (
            <Link
              href={`/courses/${courseId}`}
              className="inline-block bg-[#124b8a] text-white px-6 py-3 rounded-xl font-bold"
            >
              الذهاب للدورة
            </Link>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            لم يتم تأكيد الدفع
          </h1>

          <p className="text-slate-500 mb-6">
            لم يتم تفعيل الاشتراك. إذا تم خصم المبلغ بالفعل، انتظر قليلًا ثم تحقق مرة أخرى أو تواصل معنا.
          </p>

          <Link
            href="/"
            className="inline-block bg-slate-100 px-6 py-3 rounded-xl font-bold"
          >
            الرئيسية
          </Link>
        </>
      )}
    </div>
  );
}
