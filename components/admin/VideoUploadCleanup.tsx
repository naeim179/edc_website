"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { removeStaleVideoUpload } from "@/app/actions/video-upload-cleanup";
type Row = {
  id: string;
  provider: string;
  expected_bytes: number;
  state: string;
  created_at: string;
  course_id: string | null;
};
export default function VideoUploadCleanup({ uploads }: { uploads: Row[] }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const router = useRouter();
  const [selected, setSelected] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function remove() {
    if (!selected || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      await removeStaleVideoUpload(selected.id);
      setSelected(null);
      router.refresh();
    } catch {
      setFeedback(
        ar
          ? "تعذر التنظيف. قد يكون الفيديو ارتبط بدرس، أو لم تنتهِ المهلة، أو تعذر الاتصال بالمزوّد. لم يُحذف السجل المحلي كأنه نجح."
          : "Cleanup failed: the video may be linked, still within its grace period, or its provider unavailable. The local record was not marked as deleted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-6"
      dir={ar ? "rtl" : "ltr"}
    >
      <h1 className="text-2xl font-bold">
        {ar ? "تنظيف رفعات الفيديو المتروكة" : "Abandoned video uploads"}
      </h1>
      <p className="leading-7 text-[var(--brand-text-muted)]">
        {ar
          ? "تظهر الرفعات المسجلة بالنظام الجديد فقط، بعد مرور ٢٤ ساعة وانتهاء مهلة الرفع، إذا لم ترتبط بأي درس. لا يشمل التنظيف الفيديوهات القديمة أو المرتبطة بالدروس. يُعاد فحص الارتباط قبل الحذف لدى المزوّد."
          : "Only uploads tracked by the new system, older than 24 hours and past their upload deadline, appear if no lesson references them. Legacy and linked videos are excluded. References are checked again before provider deletion."}
      </p>
      <p className="text-sm">
        {ar
          ? "تعرض الصفحة أقدم ٥٠ سجلًا للفحص في كل مرة؛ حدّثها بعد التنظيف لإظهار المزيد."
          : "Each review considers the oldest 50 records. Refresh after cleanup to see more."}
      </p>
      {feedback && !selected && <p role="alert">{feedback}</p>}
      {uploads.length ? (
        uploads.map((row) => (
          <article
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
          >
            <div>
              <h2 className="font-bold">
                {row.provider === "bunny" ? "Bunny" : "Mux"} —{" "}
                {(row.expected_bytes / 1048576).toFixed(1)}{" "}
                {ar ? "ميبيبايت" : "MiB"}
              </h2>
              <p className="mt-2 break-all text-sm text-[var(--brand-text-muted)]">
                {row.id}
              </p>
              <time className="text-sm">
                {new Date(row.created_at).toLocaleDateString(
                  ar ? "ar-JO" : "en-US",
                )}
              </time>
            </div>
            <button
              disabled={busy}
              className="min-h-11 rounded-xl border border-red-500 px-4 py-2 font-bold text-red-700"
              onClick={() => {
                setFeedback("");
                setSelected(row);
              }}
            >
              {ar ? "حذف الرفع المتروك" : "Delete abandoned upload"}
            </button>
          </article>
        ))
      ) : (
        <p
          role="status"
          className="rounded-2xl border border-[var(--brand-border)] p-8"
        >
          {ar
            ? "لا توجد رفعات متروكة مؤهلة للتنظيف حاليًا."
            : "No abandoned uploads are eligible for cleanup."}
        </p>
      )}
      <ConfirmDialog
        open={Boolean(selected)}
        title={ar ? "حذف الفيديو غير المرتبط؟" : "Delete this unlinked video?"}
        description={
          ar
            ? "هذا يحذف نسخة الفيديو المسجلة لهذا الرفع من المزوّد نهائيًا. سيُمنع الحذف إذا ارتبطت بدرس أو لم تنتهِ المهلة."
            : "This permanently removes the video tracked by this upload from its provider. Deletion is blocked if it is linked to a lesson or still within its grace period."
        }
        confirmText={ar ? "حذف الفيديو المتروك" : "Delete abandoned video"}
        cancelText={ar ? "رجوع" : "Back"}
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!busy) setSelected(null);
        }}
      >
        {feedback && <p role="alert">{feedback}</p>}
      </ConfirmDialog>
    </div>
  );
}
