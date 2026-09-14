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
  const params = await searchParams;

  let paid = false;
  let courseId: string | null = params.course ?? null;

  if (params.tranRef) {
    try {
      const result = await fulfillPaymentByTranRef(params.tranRef);
      paid = result.paid;

      if (result.paid) {
        courseId = result.courseId;
      }
    } catch {
      paid = false;
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-20 text-center" dir="rtl">
      {paid ? (
        <>
          <h1 className="text-2xl font-bold text-[#087a54] mb-4">
            تم الدفع بنجاح
          </h1>

          <p className="text-slate-500 mb-6">
            تم تسجيلك بالدورة، تقدر تبدأ فيها الآن.
          </p>

          {courseId && (
            <Link
              href={`/courses/${courseId}`}
              className="bg-[#124b8a] text-white px-6 py-3 rounded-xl font-bold"
            >
              روح للدورة
            </Link>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            لم يتم تأكيد الدفع
          </h1>

          <p className="text-slate-500 mb-6">
            إذا انخصم مبلغ من حسابك، تواصل معنا أو راجع صفحة "طلباتي" بعد دقائق.
          </p>

          <Link
            href="/"
            className="bg-slate-100 px-6 py-3 rounded-xl font-bold"
          >
            الرئيسية
          </Link>
        </>
      )}
    </div>
  );
}
