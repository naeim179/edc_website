"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cancelCliqPayment, uploadPaymentProof } from "@/app/actions/payment-proof";
import { useLanguage } from "@/components/LanguageProvider";

export default function CliqPaymentUpload({ orderId, proofSubmitted = false, uploadEnabled = true }: {
  orderId: string; proofSubmitted?: boolean; uploadEnabled?: boolean;
}) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"upload" | "cancel" | null>(null);
  const [done, setDone] = useState(proofSubmitted);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file || busy || done) return;
    setBusy("upload"); setError("");
    const supabase = createClient();
    let uploadedPath: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      const path = `${user.id}/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (uploadError) throw uploadError;
      uploadedPath = path;
      await uploadPaymentProof(orderId, path);
      setDone(true); setFile(null);
    } catch {
      // An uncertain server-action response may already have saved the proof;
      // retain the object rather than delete evidence of a possible transfer.
      setError(ar ? (uploadedPath ? "تعذر تأكيد إرسال الإثبات. حدّث الصفحة للتحقق قبل المحاولة مجددًا." : "تعذر رفع الإثبات. حاول مجددًا.")
        : (uploadedPath ? "Submission could not be confirmed. Refresh to check before retrying." : "Upload failed. Please try again."));
    } finally { setBusy(null); }
  }

  async function cancel() {
    if (busy || done) return;
    setBusy("cancel"); setError("");
    try {
      const result = await cancelCliqPayment(orderId);
      window.location.replace(`/checkout/${result.courseId}?method=cliq`);
    } catch {
      setError(ar ? "تعذر إلغاء الطلب؛ قد يكون الإثبات أُرسل أو تمت مراجعته. حدّث الصفحة للتحقق."
        : "Unable to cancel. Proof may have been submitted or the order reviewed. Refresh to check.");
    } finally { setBusy(null); }
  }

  return <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
    <h3 className="font-bold">{ar ? "رفع إثبات تحويل CliQ" : "CliQ transfer proof"}</h3>
    {done ? <p role="status" className="mt-3 text-sm">{ar ? "تم إرسال الإثبات، بانتظار المراجعة. إذا احتجت إلغاء الطلب بعد التحويل تواصل مع الدعم." : "Proof submitted, awaiting review. Contact support if you need to cancel after transferring."}</p> : <>
      {uploadEnabled && <>
        <label htmlFor="cliq-payment-proof" className="mt-4 block text-sm">{ar ? "صورة إثبات التحويل" : "Transfer proof image"}</label>
        <input id="cliq-payment-proof" type="file" accept="image/*" disabled={Boolean(busy)} className="mt-2 block w-full min-w-0 text-sm" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={upload} disabled={!file || Boolean(busy)} className="mt-4 w-full rounded-xl bg-[#124b8a] px-5 py-3 font-bold text-white disabled:opacity-50">{busy === "upload" ? (ar ? "جاري الرفع..." : "Uploading...") : (ar ? "إرسال الإثبات" : "Submit proof")}</button>
      </>}
      {!confirmCancel ? <button type="button" onClick={() => setConfirmCancel(true)} disabled={Boolean(busy)} className="mt-3 w-full rounded-xl border border-red-300 px-5 py-3 font-bold text-red-700 disabled:opacity-50">{ar ? "إلغاء طلب الدفع" : "Cancel payment request"}</button> : <div className="mt-4 rounded-xl border p-4">
        <p className="text-sm">{ar ? "لم تحوّل المبلغ وتريد إلغاء الطلب؟ إذا حوّلت بالفعل، لا تلغِ الطلب وتواصل مع الدعم. الإلغاء لا ينفذ استردادًا ماليًا." : "Cancel only if you have not transferred the money. If you already transferred, contact support. Cancellation does not issue a refund."}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={Boolean(busy)} onClick={cancel} className="rounded-xl bg-red-700 px-4 py-2 text-white disabled:opacity-50">{busy === "cancel" ? (ar ? "جاري الإلغاء..." : "Cancelling...") : (ar ? "تأكيد الإلغاء" : "Confirm cancellation")}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmCancel(false)} className="rounded-xl border px-4 py-2">{ar ? "رجوع" : "Keep request"}</button>
        </div>
      </div>}
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
