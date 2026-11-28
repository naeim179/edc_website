import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fulfillPaymentByTranRef } from "@/lib/payments";
import CliqPaymentUpload from "@/components/CliqPaymentUpload";
import { translations } from "@/lib/i18n";

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
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const language = cookieStore.get("app-language")?.value === "en" ? "en" : "ar";
  const copy = translations[language].checkoutResult;

  let isCliq = false;
  let cliqCancelled = false;
  let proofSubmitted = false;
  let cliqAmount: string | null = null;

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

  if (params.method === "cliq" && orderId && user) {
    const { data: cliqOrder } = await supabase.from("orders")
      .select("course_id,status,payment_proof,cliq_cancelled_at,amount,currency")
      .eq("id", orderId).eq("user_id", user.id)
      .eq("payment_method", "cliq").eq("source", "manual").maybeSingle();
    if (cliqOrder) {
      courseId = cliqOrder.course_id;
      cliqAmount = `${Number(cliqOrder.amount).toFixed(2)} ${cliqOrder.currency}`;
      isCliq = cliqOrder.status === "pending";
      proofSubmitted = Boolean(cliqOrder.payment_proof);
      cliqCancelled = cliqOrder.status === "failed" && Boolean(cliqOrder.cliq_cancelled_at);
      if (cliqOrder.status === "paid") {
        paid = true;
        const { data: subscription } = await supabase.from("subscriptions")
          .select("expires_at,auto_renew").eq("student_id", user.id)
          .eq("course_id", courseId).maybeSingle();
        expiresAt = subscription?.expires_at ?? null;
        autoRenew = Boolean(subscription?.auto_renew);
      }
    }
  }

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


  // The return URL is user editable: only show confirmed cancellation for
  // this signed-in student's order after a verified database closure.
  let cancelled = false;
  if (!paid && params.cancelled === "1" && orderId && user) {
    const { data: cancelledOrder } = await supabase
      .from("orders")
      .select("course_id,paytabs_closed_cancelled_at")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("payment_method", "paytabs")
      .eq("status", "failed")
      .maybeSingle();
    if (cancelledOrder?.paytabs_closed_cancelled_at) {
      cancelled = true;
      courseId = cancelledOrder.course_id;
    }
  }

  // Group courses can retry checkout directly.
  // Private courses must select their schedule again.
  let retryHref = courseId
    ? "/courses/" + courseId
    : "/courses";

  if (cancelled && courseId) {
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
      className="mx-4 my-6 max-w-lg rounded-[26px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 text-center shadow-sm sm:mx-auto sm:my-20 sm:p-8"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {cliqCancelled ? (
        <>
          <h1 className="mb-4 text-2xl font-bold">{copy.cliqCancelledTitle}</h1>
          <p className="mb-5">{copy.cliqCancelledDescription}</p>
          <Link href={courseId ? `/checkout/${courseId}?method=cliq` : "/courses"} className="inline-block rounded-xl bg-[#124b8a] px-6 py-3 font-bold text-white">{copy.backToCheckout}</Link>
        </>
      ) : isCliq ? (
        <>
          <h1 className="text-2xl font-bold text-[var(--brand-ink)] mb-4">
            {copy.cliqTitle}
          </h1>
          {cliqAmount && <p dir="ltr" className="mb-4 text-xl font-bold">{cliqAmount}</p>}
          <p className="mb-4 text-sm text-slate-600">{copy.cliqDescription}</p>

          <p className="text-slate-600 mb-4">
            {cliqReady ? copy.cliqInstructions : copy.cliqUnavailable}
          </p>

          {cliqReady && (
          <div className="bg-slate-50 rounded-xl p-5 text-start mb-5">
            <p className="font-bold">
              {copy.accountName} <bdi>{cliqAccountName}</bdi>
            </p>

            <p className="mt-2">
              {copy.cliqAlias} <bdi>{cliqAlias}</bdi>
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {copy.cliqReviewDescription}
            </p>
          </div>
          )}

          {orderId && (
            <CliqPaymentUpload
              orderId={orderId}
              proofSubmitted={proofSubmitted}
              uploadEnabled={cliqReady}
            />
          )}
        </>
      ) : cancelled ? (
        <div className="py-3">

          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--brand-success-bg)] text-[var(--brand-success)] ring-8 ring-[var(--brand-ink-soft)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="42"
              height="42"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.5 2.5L16 9" />
            </svg>
          </div>

          <span className="inline-flex rounded-full border border-[var(--brand-border)] bg-[var(--brand-ink-soft)] px-4 py-1.5 text-xs font-bold text-[var(--brand-text)]">
            {copy.cancelledBadge}
          </span>

          <h1 className="mt-5 text-2xl font-extrabold leading-relaxed text-[var(--brand-text)] sm:text-3xl">
            {copy.cancelledTitle}
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm leading-8 text-[var(--brand-text-muted)] sm:text-base">
            {copy.cancelledDescription}
          </p>

          <div className="mt-7 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-ink-soft)] p-4 text-start">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-surface)] text-[var(--brand-ink)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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
                <p className="font-bold text-[var(--brand-text)]">
                  {copy.retryTitle}
                </p>
                <p className="mt-1 text-sm leading-7 text-[var(--brand-text)]">
                  {copy.retryDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={retryHref}
              className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--brand-ink)] px-5 py-3.5 font-bold text-[var(--brand-on-ink)] shadow-sm transition hover:bg-[var(--brand-ink-hover)]"
            >
              {copy.retry}
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
              className="flex min-h-13 flex-1 items-center justify-center rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-5 py-3.5 font-bold text-[var(--brand-text)] transition hover:bg-[var(--brand-ink-soft)]"
            >
              {copy.backToCourse}
            </Link>
          </div>

          <p className="mt-6 text-xs text-[var(--brand-text-muted)]">
            {copy.thankYou}
          </p>
        </div>
      ) : paid ? (
        <>
          <h1 className="text-2xl font-bold text-[var(--brand-ink)] mb-4">
            {copy.paidTitle}
          </h1>

          <p className="text-slate-500 mb-4">
            {copy.paidDescription}
          </p>

          {expiresAt && (
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-slate-500">
                {copy.validUntil}
              </p>

              <p className="font-bold text-slate-800 mt-1">
                {new Date(expiresAt).toLocaleDateString(language === "ar" ? "ar-JO" : "en-GB", {
                  timeZone: "Asia/Amman",
                })}
              </p>
            </div>
          )}

          <p className="text-sm text-slate-500 mb-6">
            {autoRenew
              ? copy.autoRenew
              : copy.manualRenew}
          </p>

          {courseId && (
            <Link
              href={`/courses/${courseId}`}
              className="inline-block bg-[#124b8a] text-white px-6 py-3 rounded-xl font-bold"
            >
              {copy.goToCourse}
            </Link>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-[var(--brand-danger)] mb-4">
            {copy.unconfirmedTitle}
          </h1>

          <p className="text-slate-500 mb-6">
            {copy.unconfirmedDescription}
          </p>

          <Link
            href="/"
            className="inline-block bg-slate-100 px-6 py-3 rounded-xl font-bold"
          >
            {copy.home}
          </Link>
        </>
      )}
    </div>
  );
}
