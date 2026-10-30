import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fulfillPaymentByTranRef } from "@/lib/payments";
import CliqPaymentUpload from "@/components/CliqPaymentUpload";

type SearchParams = {
  tranRef?: string;
  course?: string;
  method?: string;
  order?: string;
  cancelled?: string;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params =
    await searchParams;

  const isCliq =
    params.method === "cliq";

  const cliqAlias = process.env.CLIQ_ALIAS?.trim();
  const cliqAccountName = process.env.CLIQ_ACCOUNT_NAME?.trim();
  const cliqReady = Boolean(cliqAlias && cliqAccountName);

  const orderId =
    params.order ?? null;

  let paid = false;

  let courseId:
    string | null =
    params.course ?? null;

  let expiresAt:
    string | null = null;

  let autoRenew = false;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (params.tranRef && user) {
    for (
      let attempt = 0;
      attempt < 5;
      attempt++
    ) {
      try {
        const result =
          await fulfillPaymentByTranRef(
            params.tranRef,
            null,
            user.id
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


  // Group courses can retry checkout directly.
  // Private courses must select their schedule again.
  let retryHref = courseId
    ? "/courses/" + courseId
    : "/courses";

  if (params.cancelled === "1" && courseId) {
    const { data: cancelledCourse } = await supabase
      .from("courses")
      .select("course_type")
      .eq("id", courseId)
      .maybeSingle();

    if (cancelledCourse?.course_type === "group") {
      retryHref = "/checkout/" + courseId;
    }
  }

  return (
    <div
      className="mx-4 mt-6 max-w-lg rounded-[26px] border bg-white p-5 text-center shadow-sm sm:mx-auto sm:mt-20 sm:p-8"
      dir="rtl"
    >
      {isCliq ? (
        <>
          <h1 className="text-2xl font-bold text-[#087a54] mb-4">
            الدفع عبر CliQ
          </h1>

          <p className="text-slate-600 mb-4">
            {cliqReady ? "قم بتحويل المبلغ إلى حساب CliQ التالي ثم ارفع إثبات التحويل." : "الدفع عبر CliQ غير متاح حاليًا. يرجى اختيار طريقة دفع أخرى."}
          </p>

          {cliqReady && (
          <div className="bg-slate-50 rounded-xl p-5 text-right mb-5">
            <p className="font-bold">
              اسم الحساب: {cliqAccountName}
            </p>

            <p className="mt-2">
              معرّف CliQ: {cliqAlias}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              سيتم تفعيل الدورة بعد مراجعة التحويل.
            </p>
          </div>
          )}

          {cliqReady && orderId && (
            <CliqPaymentUpload
              orderId={orderId}
            />
          )}
        </>
      ) : params.cancelled === "1" ? (
        <div className="py-3">

          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[#E9F4ED] ring-8 ring-[#F5F9F5]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1D7058"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.5 2.5L16 9" />
            </svg>
          </div>

          <span className="inline-flex rounded-full border border-[#D7EADD] bg-[#F0F8F2] px-4 py-1.5 text-xs font-bold text-[#277151]">
            تم تأكيد الإلغاء
          </span>

          <h1 className="mt-5 text-2xl font-extrabold leading-relaxed text-[#193C35] sm:text-3xl">
            تم إلغاء عملية الدفع
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-8 text-[#75817C] sm:text-base">
            تم التحقق من إلغاء محاولة الدفع بنجاح،
            ولم يتم تفعيل اشتراك جديد.
            يمكنك إعادة المحاولة في أي وقت.
          </p>

          <div className="mt-7 rounded-2xl border border-[#F0DFC6] bg-[#FFF8EB] p-4 text-right">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F9E9CB]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#B87535"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>

              <div>
                <p className="font-bold text-[#644A30]">
                  حابب تحاول مرة ثانية؟
                </p>
                <p className="mt-1 text-sm leading-7 text-[#967E60]">
                  بإمكانك بدء محاولة دفع جديدة.
                  وإذا كانت الدورة خاصة، اختر مواعيدك مجددًا.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={retryHref}
              className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#C9704C] px-5 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#B7603F]"
            >
              إعادة المحاولة
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
            </Link>

            <Link
              href={courseId ? "/courses/" + courseId : "/courses"}
              className="flex min-h-13 flex-1 items-center justify-center rounded-2xl border border-[#DDD3BE] bg-[#FFFCF5] px-5 py-3.5 font-bold text-[#38554A] transition hover:bg-[#F4ECDD]"
            >
              العودة للدورة
            </Link>
          </div>

          <p className="mt-6 text-xs text-[#A5A89C]">
            شكرًا لاستخدامك Your Way
          </p>
        </div>
      ) : paid ? (
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
