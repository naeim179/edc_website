"use client";
import { useEffect, useRef, useState, useId, type ChangeEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  MAX_VIDEO_BYTES,
  VIDEO_UPLOAD_TIMEOUT_MS,
  VIDEO_PROCESSING_TIMEOUT_MS,
  VIDEO_POLL_INTERVAL_MS,
  validateVideoFile,
  type UploadProvider,
} from "@/lib/video-upload-policy";

type VideoProvider = "youtube" | UploadProvider;
type State =
  | "idle"
  | "creating"
  | "uploading"
  | "processing"
  | "ready"
  | "error";
type Pending = { id: string; provider: UploadProvider; processing: boolean };
type Status = {
  ready: boolean;
  assetId?: string;
  playbackId?: string;
  videoId?: string;
  libraryId?: string;
  code?: string;
};
type Props = {
  courseId: string;
  defaultProvider?: VideoProvider;
  defaultYoutubeUrl?: string;
  defaultMuxPlaybackId?: string;
  defaultMuxAssetId?: string;
  defaultBunnyLibraryId?: string;
  defaultBunnyVideoId?: string;
};

export default function LessonVideoFields({
  courseId,
  defaultProvider = "youtube",
  defaultYoutubeUrl = "",
  defaultMuxPlaybackId = "",
  defaultMuxAssetId = "",
  defaultBunnyLibraryId = "",
  defaultBunnyVideoId = "",
}: Props) {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const fieldId = useId();
  const root = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const [provider, setProvider] = useState<VideoProvider>(defaultProvider);
  const [muxPlaybackId, setMuxPlaybackId] = useState(defaultMuxPlaybackId);
  const [muxAssetId, setMuxAssetId] = useState(defaultMuxAssetId);
  const [bunnyLibraryId, setBunnyLibraryId] = useState(defaultBunnyLibraryId);
  const [bunnyVideoId, setBunnyVideoId] = useState(defaultBunnyVideoId);
  const [state, setState] = useState<State>(
    (defaultProvider === "mux" && defaultMuxPlaybackId) ||
      (defaultProvider === "bunny" &&
        defaultBunnyLibraryId &&
        defaultBunnyVideoId)
      ? "ready"
      : "idle",
  );
  const [pending, setPending] = useState<Pending | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const busy =
    ["creating", "uploading", "processing"].includes(state) || cancelling;
  const url = (id: string) =>
    `/api/video-uploads/${encodeURIComponent(id)}?courseId=${encodeURIComponent(courseId)}`;
  const message = (code: string) =>
    (
      ({
        UPLOAD_NOT_VIDEO: t.lessonVideo.notVideo,
        UPLOAD_PENDING: t.lessonVideo.needUpload,
        UPLOAD_CANCELLATION_UNCONFIRMED: ar
          ? "توقّف النقل، لكن تعذر تأكيد الإلغاء. أعد محاولة الإلغاء قبل رفع ملف جديد."
          : "Transfer stopped, but cancellation could not be confirmed. Retry cancellation before selecting another file.",
        UPLOAD_EMPTY: ar
          ? "الفيديو فارغ. اختر ملفًا يحتوي بيانات."
          : "The video is empty. Choose a file containing data.",
        UPLOAD_TOO_LARGE: ar
          ? "حجم الفيديو يتجاوز الحد المسموح: ٩٠ ميبيبايت."
          : "This video exceeds the 90 MiB limit.",
        UPLOAD_SIZE_MISMATCH: ar
          ? "حجم الملف المستلم لا يطابق الملف المختار. ألغِ المحاولة وأعد الرفع."
          : "The received size does not match the selected file. Cancel this attempt and upload again.",
        UPLOAD_DAILY_LIMIT: ar
          ? "وصلت إلى حد ١٠ محاولات رفع خلال ٢٤ ساعة. جرّب لاحقًا."
          : "You reached 10 upload attempts within 24 hours. Try again later.",
        UPLOAD_ACTIVE_LIMIT: ar
          ? "توجد محاولتا رفع نشطتان للحساب أو الدورة. أكملهما أو ألغِهما أولًا."
          : "Two uploads are active for this account or course. Complete or cancel them first.",
        UPLOAD_COURSE_LIMIT: ar
          ? "وصلت المرفوعات الجديدة للدورة إلى حصتها. اطلب من المدير مراجعة الرفعات المتروكة."
          : "New uploads for this course reached their allowance. Ask an administrator to review abandoned uploads.",
        UPLOAD_UNAUTHORIZED: ar
          ? "لم تعد لديك صلاحية رفع فيديو لهذه الدورة."
          : "You no longer have permission to upload to this course.",
        UPLOAD_NOT_CONFIGURED: ar
          ? "مزوّد الفيديو غير مهيأ حاليًا. تواصل مع المدير."
          : "The video provider is not configured. Contact an administrator.",
        UPLOAD_EXPIRED: ar
          ? "انتهت مهلة هذه المحاولة. ألغِها ثم اختر الفيديو مجددًا."
          : "This upload attempt expired. Cancel it and select the video again.",
        UPLOAD_CANCELLED: t.lessonVideo.uploadCancelled,
        UPLOAD_FAILED: ar
          ? "فشل رفع الفيديو أو معالجته. ألغِ المحاولة ثم أعد الرفع."
          : "Video upload or processing failed. Cancel this attempt and upload again.",
        UPLOAD_TIMEOUT: ar
          ? "انتهت مهلة الرفع. تحقق من اتصالك وألغِ المحاولة قبل إعادة الرفع."
          : "Upload timed out. Check your connection and cancel this attempt before retrying.",
        PROCESSING_PAUSED: ar
          ? "المعالجة قد تكون مستمرة. اضغط «تحقق مجددًا» لمتابعة نفس الفيديو دون رفعه مرة أخرى."
          : "Processing may still be running. Select “Check again” to resume this video without uploading it again.",
      }) as Record<string, string>
    )[code] ??
    (ar
      ? "تعذر إكمال العملية. جرّب مجددًا أو تواصل مع المدير."
      : "Unable to complete the operation. Try again or contact an administrator.");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      xhr.current?.abort();
    };
  }, []);
  useEffect(() => {
    const form = root.current?.closest("form");
    const guard = (event: Event) => {
      if (busy || pending) {
        event.preventDefault();
        setError("UPLOAD_PENDING");
      }
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (busy || pending) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    form?.addEventListener("submit", guard, true);
    window.addEventListener("beforeunload", leave);
    return () => {
      form?.removeEventListener("submit", guard, true);
      window.removeEventListener("beforeunload", leave);
    };
  }, [busy, pending]);
  async function check(p: Pending, token: number, signal: AbortSignal) {
    const deadline = Date.now() + VIDEO_PROCESSING_TIMEOUT_MS;
    while (Date.now() < deadline) {
      signal.throwIfAborted();
      const response = await fetch(url(p.id), {
        signal: AbortSignal.any([signal, AbortSignal.timeout(40_000)]),
        cache: "no-store",
      });
      const data: Status = await response.json();
      if (!response.ok)
        throw new Error(
          response.status >= 500
            ? "PROCESSING_PAUSED"
            : (data.code ?? "UPLOAD_FAILED"),
        );
      if (data.ready) {
        if (
          (p.provider === "mux" && (!data.assetId || !data.playbackId)) ||
          (p.provider === "bunny" && (!data.videoId || !data.libraryId))
        )
          throw new Error("UPLOAD_FAILED");
        if (mounted.current && generation.current === token) {
          if (p.provider === "mux") {
            setMuxAssetId(data.assetId!);
            setMuxPlaybackId(data.playbackId!);
          } else {
            setBunnyVideoId(data.videoId!);
            setBunnyLibraryId(data.libraryId!);
          }
          setPending(null);
          setState("ready");
          setError("");
        }
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(new Error("UPLOAD_CANCELLED"));
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, VIDEO_POLL_INTERVAL_MS);
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }
    throw new Error("PROCESSING_PAUSED");
  }
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy || pending || provider === "youtube") return;
    try {
      validateVideoFile(file.size, file.type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "UPLOAD_NOT_VIDEO");
      return;
    }
    const selectedProvider = provider;
    const token = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setFileName(file.name);
    setError("");
    setProgress(0);
    setState("creating");
    try {
      const response = await fetch(`/api/${selectedProvider}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, size: file.size, type: file.type }),
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(40_000)]),
      });
      const data = await response.json();
      if (!response.ok || !data.uploadId)
        throw new Error(data.code ?? "UPLOAD_FAILED");
      if (!mounted.current || generation.current !== token) return;
      const p: Pending = {
        id: data.uploadId,
        provider: selectedProvider,
        processing: false,
      };
      setPending(p);
      setState("uploading");
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        xhr.current = request;
        request.open("PUT", url(p.id));
        request.setRequestHeader("Content-Type", file.type);
        request.timeout = VIDEO_UPLOAD_TIMEOUT_MS + 30_000;
        request.upload.onprogress = (e) => {
          if (
            e.lengthComputable &&
            mounted.current &&
            generation.current === token
          )
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) {
            resolve();
            return;
          }
          let code = "UPLOAD_FAILED";
          try {
            code = JSON.parse(request.responseText).code ?? code;
          } catch {}
          reject(new Error(code));
        };
        request.onerror = () => reject(new Error("PROCESSING_PAUSED"));
        request.ontimeout = () => reject(new Error("UPLOAD_TIMEOUT"));
        request.onabort = () => reject(new Error("UPLOAD_CANCELLED"));
        request.send(file);
      });
      if (!mounted.current || generation.current !== token) return;
      setProgress(100);
      p.processing = true;
      setPending({ ...p });
      setState("processing");
      await check(p, token, abort.signal);
    } catch (e) {
      if (mounted.current && generation.current === token) {
        setState("error");
        setError(e instanceof Error ? e.message : "UPLOAD_FAILED");
      }
    }
  }
  async function resume() {
    if (!pending || busy) return;
    const token = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    setState("processing");
    try {
      await check(pending, token, abort.signal);
    } catch (e) {
      if (mounted.current && generation.current === token) {
        setState("error");
        setError(e instanceof Error ? e.message : "PROCESSING_PAUSED");
      }
    }
  }
  async function cancel() {
    if (!pending || cancelling) return;
    generation.current++;
    controller.current?.abort();
    xhr.current?.abort();
    setCancelling(true);
    setState("error");
    try {
      const response = await fetch(url(pending.id), {
        method: "DELETE",
        signal: AbortSignal.timeout(40_000),
      });
      if (!response.ok) throw new Error();
      setPending(null);
      setState("idle");
      setError("UPLOAD_CANCELLED");
      setProgress(0);
      setFileName("");
    } catch {
      setError("UPLOAD_CANCELLATION_UNCONFIRMED");
    } finally {
      setCancelling(false);
    }
  }
  const hasVideo =
    provider === "mux" ? Boolean(muxPlaybackId) : Boolean(bunnyVideoId);
  return (
    <div ref={root} className="space-y-4">
      <input type="hidden" name="video_provider" value={provider} />
      <input type="hidden" name="mux_asset_id" value={muxAssetId} />
      <input type="hidden" name="mux_playback_id" value={muxPlaybackId} />
      <input type="hidden" name="bunny_library_id" value={bunnyLibraryId} />
      <input type="hidden" name="bunny_video_id" value={bunnyVideoId} />
      <div>
        <p className="mb-2 text-sm font-bold">{t.lessonVideo.source}</p>
        <div
          role="group"
          aria-label={t.lessonVideo.source}
          className="grid gap-3 sm:grid-cols-3"
        >
          {(["youtube", "mux", "bunny"] as VideoProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy || Boolean(pending)}
              aria-pressed={provider === p}
              onClick={() => {
                setProvider(p);
                setError("");
                setFileName("");
                setState(
                  (p === "mux" && muxPlaybackId) ||
                    (p === "bunny" && bunnyVideoId)
                    ? "ready"
                    : "idle",
                );
              }}
              className={`min-h-11 rounded-xl border p-4 text-center disabled:opacity-60 ${provider === p ? "border-[var(--brand-ink)] bg-[var(--brand-bg)] font-bold" : "border-[var(--brand-border)] bg-[var(--brand-surface)]"}`}
            >
              {p === "youtube" ? "YouTube" : p === "mux" ? "Mux" : "Bunny"}
              <span className="mt-1 block text-xs">
                {p === "youtube"
                  ? t.lessonVideo.youtubeDescription
                  : p === "mux"
                    ? t.lessonVideo.protectedVideo
                    : ar
                      ? "رفع فيديو"
                      : "Video upload"}
              </span>
            </button>
          ))}
        </div>
      </div>
      {provider === "youtube" ? (
        <div>
          <label htmlFor={fieldId} className="mb-2 block text-sm font-bold">
            {t.lessonVideo.youtubeUrl}
          </label>
          <input
            id={fieldId}
            type="url"
            name="youtube_url"
            required
            defaultValue={defaultYoutubeUrl}
            dir="ltr"
            placeholder={t.lessonVideo.youtubePlaceholder}
            className="w-full rounded-xl border px-4 py-3"
          />
          <p className="mt-2 text-xs text-[var(--brand-text-muted)]">
            {t.lessonVideo.youtubeSupport}
          </p>
        </div>
      ) : (
        <div
          className="space-y-4 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-5"
          aria-busy={busy}
        >
          <p className="font-bold">
            {provider === "mux"
              ? t.lessonVideo.muxVideo
              : t.lessonVideo.bunnyVideo}
          </p>
          <p
            id={`${fieldId}-limits`}
            className="text-sm leading-7 text-[var(--brand-text-muted)]"
          >
            {ar
              ? `الحد ${MAX_VIDEO_BYTES / 1048576} ميبيبايت للملف. محاولتا رفع نشطتان، و١٠ محاولات خلال ٢٤ ساعة للحساب. حصة المرفوعات الجديدة للدورة ٢ جيبيبايت.`
              : `Up to ${MAX_VIDEO_BYTES / 1048576} MiB per file. Two active uploads and 10 attempts per account within 24 hours. New uploads have a 2 GiB allowance per course.`}
          </p>
          <label
            className={`relative block rounded-xl border-2 border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 text-center focus-within:outline-2 focus-within:outline-offset-4 ${busy || pending ? "opacity-60" : "cursor-pointer"}`}
          >
            <input
              type="file"
              accept="video/*"
              className="sr-only"
              aria-describedby={`${fieldId}-limits`}
              disabled={busy || Boolean(pending)}
              onChange={choose}
            />
            <span className="block font-bold">
              {busy
                ? t.lessonVideo.working
                : hasVideo
                  ? t.lessonVideo.replaceVideo
                  : t.lessonVideo.chooseVideo}
            </span>
            <span className="mt-2 block text-xs text-[var(--brand-text-muted)]">
              {t.lessonVideo.videoFormats}
            </span>
          </label>
          {fileName && <p className="break-all text-sm">{fileName}</p>}
          {state === "creating" && (
            <p role="status">{t.lessonVideo.preparingUpload}</p>
          )}
          {state === "uploading" && (
            <div role="status">
              <p>
                {t.lessonVideo.uploading} {progress}%
              </p>
              <progress
                max={100}
                value={progress}
                aria-label={t.lessonVideo.uploading}
                className="mt-2 h-3 w-full accent-[var(--brand-ink)]"
              />
            </div>
          )}
          {state === "processing" && (
            <p role="status" className="text-[var(--brand-text-muted)]">
              {t.lessonVideo.processing}
            </p>
          )}
          {state === "ready" && hasVideo && (
            <div
              role="status"
              className="rounded-xl border border-[var(--brand-border)] p-4"
            >
              <p className="font-bold">{t.lessonVideo.ready}</p>
              <p className="mt-2 text-sm">{t.lessonVideo.saved}</p>
            </div>
          )}
          {error && (
            <p role="alert" className="leading-7 text-red-700">
              {message(error)}
            </p>
          )}
          {pending && (
            <div className="flex flex-wrap gap-3">
              {state === "error" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resume()}
                  className="min-h-11 rounded-xl border border-[var(--brand-border)] px-4 py-2 font-bold"
                >
                  {ar ? "تحقق مجددًا" : "Check again"}
                </button>
              )}
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void cancel()}
                className="min-h-11 rounded-xl border border-[var(--brand-border)] px-4 py-2 font-bold"
              >
                {cancelling
                  ? t.lessonVideo.working
                  : ar
                    ? "إلغاء محاولة الرفع"
                    : "Cancel upload attempt"}
              </button>
            </div>
          )}
          {!hasVideo && state === "idle" && (
            <p className="text-xs text-[var(--brand-text-muted)]">
              {t.lessonVideo.needUpload}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
