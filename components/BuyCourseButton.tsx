"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createOrder } from "@/app/actions/orders";
import { useLanguage } from "@/components/LanguageProvider";
import { useCheckoutRecovery } from "@/lib/hooks/use-checkout-recovery";

export default function BuyCourseButton({
  courseId, subscriptionMonths = 1, autoRenew = false, paymentMethod = "paytabs",
  label, couponCode = "", privateBookingId, disabled = false,
}: {
  courseId: string;
  subscriptionMonths?: 1 | 3;
  autoRenew?: boolean;
  paymentMethod?: "paytabs" | "paypal" | "cliq";
  label?: string;
  couponCode?: string;
  privateBookingId?: string | null;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const isArabic = /[\u0600-\u06FF]/.test(t.booking.continueToPayment);
  const { recovery, check, watch } = useCheckoutRecovery(courseId);
  const [errorCode, setErrorCode] = useState<"generic" | null>(null);
  const [queued, setQueued] = useState(false);
  const queueActive = useRef(false);
  const [pending, startTransition] = useTransition();

  const purchase = useCallback(() => {
    if (pending || disabled) return;
    queueActive.current = false;
    setQueued(false);
    setErrorCode(null);
    startTransition(async () => {
      try {
        const result = await createOrder(courseId, subscriptionMonths, autoRenew, paymentMethod, couponCode, privateBookingId ?? undefined);
        if (result && typeof result === "object" && "checkoutError" in result) {
          if (result.checkoutError === "PAYTABS_PENDING" || result.checkoutError === "PAYMENT_INIT_UNCERTAIN") {
            queueActive.current = true;
            setQueued(true);
            watch("orderId" in result ? String(result.orderId) : undefined);
          } else setErrorCode("generic");
        }
      } catch {
        setErrorCode("generic");
      }
    });
  }, [pending, disabled, courseId, subscriptionMonths, autoRenew, paymentMethod, couponCode, privateBookingId, watch]);

  useEffect(() => {
    if (recovery.state === "paid") {
      window.location.replace(`/courses/${courseId}`);
    }
    if (recovery.state === "reschedule") {
      window.location.replace(`/courses/${courseId}/schedule`);
    }
    if (recovery.state !== "ready" || !queued || disabled || pending) return;
    const timer = window.setTimeout(() => {
      if (!queueActive.current) return;
      purchase();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recovery.state, queued, disabled, pending, purchase, courseId]);

  function handleBuy() {
    if (recovery.state === "pending") {
      queueActive.current = true;
      setQueued(true);
      void check();
      return;
    }
    purchase();
  }

  const blocked = recovery.state === "checking" || recovery.state === "error" || recovery.state === "review" || recovery.state === "paid" || recovery.state === "reschedule";

  return (
    <div className="w-full">
      <button type="button" disabled={pending || disabled || queued || blocked} onClick={handleBuy}
        className="w-full rounded-xl bg-[#C9704A] px-6 py-3.5 font-bold text-white transition hover:bg-[#B15F3B] disabled:cursor-not-allowed disabled:opacity-50">
        {recovery.state === "checking"
          ? (isArabic ? "جاري التحقق من حالة الدفع..." : "Checking payment status...")
          : queued
            ? (isArabic ? "المتابعة تلقائيًا بعد التحقق..." : "Continuing automatically after verification...")
            : pending ? t.booking.paying : label ?? t.booking.continueToPayment}
      </button>

      {recovery.state === "pending" && (
        <div role="status" aria-live="polite" className="mt-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 text-sm leading-7 text-[var(--brand-text)]">
          <p>{isArabic
            ? "نتحقق تلقائيًا من انتهاء محاولة PayTabs السابقة بدون دفع. إذا كانت صفحة البطاقة ما زالت نشطة، قد يستغرق التحقق حتى 15 دقيقة."
            : "We are automatically checking that the previous PayTabs attempt ended unpaid. If the card checkout is still active, verification may take up to 15 minutes."}</p>
          <p>{queued
            ? (isArabic ? "حفظنا اختيارك، وسنكمل عليه تلقائيًا بعد التأكيد. غيّر طريقة الدفع أو المدة لإيقاف المتابعة المحفوظة."
              : "Your choice is saved for this page. We will continue automatically after confirmation. Changing the payment method or duration stops the saved continuation.")
            : (isArabic ? "اختر طريقة الدفع واضغط زر الدفع؛ سنكمل اختيارك تلقائيًا بعد التأكيد، بدون إلغاء يدوي."
              : "Choose a payment method and press Pay; we will continue automatically after confirmation, without manual cancellation.")}</p>
          {queued && <button type="button" className="mt-2 font-bold underline underline-offset-4" onClick={() => { queueActive.current = false; setQueued(false); }}>
            {isArabic ? "إيقاف المتابعة التلقائية" : "Stop automatic continuation"}
          </button>}
        </div>
      )}
      {recovery.state === "error" && <p role="alert" className="mt-3 text-sm">
        {isArabic ? "تعذر تحديث حالة الدفع. سنحاول تلقائيًا عند عودة الاتصال. " : "Payment status could not be refreshed. We will retry automatically when the connection returns. "}
        <button type="button" className="font-bold underline" onClick={() => { void check(); }}>{isArabic ? "إعادة التحقق" : "Check again"}</button>
      </p>}
      {recovery.state === "review" && <p role="alert" className="mt-3 text-sm">
        {isArabic ? "نتيجة المحاولة السابقة تحتاج مراجعة من الدعم. يرجى مراجعتها قبل دفع مبلغ جديد." : "The previous payment needs a support review before another payment can begin."}
      </p>}
      {errorCode && <p role="alert" aria-live="assertive" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
        {isArabic ? "تعذر إكمال الطلب. حدّث الصفحة وحاول مجددًا، أو تواصل مع الدعم إذا استمرت المشكلة." : "Unable to complete the request. Refresh and try again, or contact support if the problem continues."}
      </p>}
    </div>
  );
}
