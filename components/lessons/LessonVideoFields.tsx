"use client";

import { ChangeEvent, useState } from "react";

type VideoProvider =
  | "youtube"
  | "mux"
  | "bunny";

type UploadState =
  | "idle"
  | "creating"
  | "uploading"
  | "processing"
  | "ready"
  | "error";

type Props = {
  courseId: string;
  defaultProvider?: VideoProvider;
  defaultYoutubeUrl?: string;
  defaultMuxPlaybackId?: string;
  defaultMuxAssetId?: string;
  defaultBunnyLibraryId?: string;
  defaultBunnyVideoId?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

export default function LessonVideoFields({
  courseId,
  defaultProvider = "youtube",
  defaultYoutubeUrl = "",
  defaultMuxPlaybackId = "",
  defaultMuxAssetId = "",
  defaultBunnyLibraryId = "",
  defaultBunnyVideoId = "",
}: Props) {
  const [provider, setProvider] =
    useState<VideoProvider>(
      defaultProvider
    );

  const [muxPlaybackId, setMuxPlaybackId] =
    useState(
      defaultMuxPlaybackId
    );

  const [muxAssetId, setMuxAssetId] =
    useState(
      defaultMuxAssetId
    );

  const [bunnyLibraryId, setBunnyLibraryId] =
    useState(
      defaultBunnyLibraryId
    );

  const [bunnyVideoId, setBunnyVideoId] =
    useState(
      defaultBunnyVideoId
    );

  const [uploadState, setUploadState] =
    useState<UploadState>(
      defaultMuxPlaybackId
        ? "ready"
        : "idle"
    );

  const [progress, setProgress] =
    useState(0);

  const [fileName, setFileName] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  async function pollMuxUpload(
    uploadId: string
  ) {
    // تقريبًا 5 دقائق كحد أقصى.
    for (
      let attempt = 0;
      attempt < 150;
      attempt += 1
    ) {
      const response = await fetch(
        `/api/mux/upload/${encodeURIComponent(
          uploadId
        )}?courseId=${encodeURIComponent(
          courseId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = (await response.json()) as {
        uploadStatus?: string;
        assetId?: string | null;
        playbackId?: string | null;
        assetStatus?: string | null;
        ready?: boolean;
        error?: string | null;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            "تعذر التحقق من حالة الفيديو"
        );
      }

      if (data.error) {
        throw new Error(
          data.error
        );
      }

      if (
        data.ready &&
        data.assetId &&
        data.playbackId
      ) {
        setMuxAssetId(
          data.assetId
        );

        setMuxPlaybackId(
          data.playbackId
        );

        setUploadState(
          "ready"
        );

        return;
      }

      if (
        data.uploadStatus ===
          "errored" ||
        data.uploadStatus ===
          "cancelled" ||
        data.uploadStatus ===
          "timed_out" ||
        data.assetStatus ===
          "errored"
      ) {
        throw new Error(
          "فشل Mux في معالجة الفيديو"
        );
      }

      await sleep(2000);
    }

    throw new Error(
      "استغرقت معالجة الفيديو وقتًا أطول من المتوقع"
    );
  }

  async function handleMuxFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "video/"
      )
    ) {
      setUploadState(
        "error"
      );

      setErrorMessage(
        "الملف المختار ليس فيديو"
      );

      return;
    }

    try {
      setFileName(file.name);
      setErrorMessage("");
      setProgress(0);

      // إذا كان الدرس يحتوي فيديو قديم،
      // لا نستبدل الـIDs إلا بعد نجاح الفيديو الجديد.
      setUploadState(
        "creating"
      );

      /*
       * 1) نطلب من السيرفر
       * Signed Direct Upload URL.
       */
      const createResponse =
        await fetch(
          "/api/mux/upload",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              courseId,
            }),
          }
        );

      const createData =
        (await createResponse.json()) as {
          uploadId?: string;
          uploadUrl?: string;
          error?: string;
        };

      if (
        !createResponse.ok ||
        !createData.uploadId ||
        !createData.uploadUrl
      ) {
        throw new Error(
          createData.error ||
            "تعذر تجهيز رفع الفيديو"
        );
      }

      /*
       * 2) الملف يذهب من المتصفح
       * مباشرة إلى Mux.
       */
      setUploadState(
        "uploading"
      );

      await new Promise<void>(
        (resolve, reject) => {
          const xhr =
            new XMLHttpRequest();

          xhr.open(
            "PUT",
            createData.uploadUrl!,
            true
          );

          if (file.type) {
            xhr.setRequestHeader(
              "Content-Type",
              file.type
            );
          }

          xhr.upload.onprogress = (
            progressEvent
          ) => {
            if (
              !progressEvent.lengthComputable
            ) {
              return;
            }

            const percent =
              Math.round(
                (progressEvent.loaded /
                  progressEvent.total) *
                  100
              );

            setProgress(
              percent
            );
          };

          xhr.onload = () => {
            if (
              xhr.status >= 200 &&
              xhr.status < 300
            ) {
              setProgress(100);
              resolve();
              return;
            }

            reject(
              new Error(
                `فشل رفع الفيديو إلى Mux (${xhr.status})`
              )
            );
          };

          xhr.onerror = () => {
            reject(
              new Error(
                "انقطع الاتصال أثناء رفع الفيديو"
              )
            );
          };

          xhr.onabort = () => {
            reject(
              new Error(
                "تم إلغاء رفع الفيديو"
              )
            );
          };

          xhr.send(file);
        }
      );

      /*
       * 3) الرفع انتهى.
       * ننتظر Mux حتى ينشئ ويعالج Asset.
       */
      setUploadState(
        "processing"
      );

      await pollMuxUpload(
        createData.uploadId
      );
    } catch (error) {
      console.error(
        "MUX_UPLOAD_ERROR",
        error
      );

      setUploadState(
        "error"
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء رفع الفيديو"
      );
    }
  }


  async function handleBunnyFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("video/")
    ) {
      setUploadState("error");
      setErrorMessage(
        "الملف المختار ليس فيديو"
      );
      return;
    }

    try {
      setFileName(file.name);
      setErrorMessage("");
      setProgress(0);
      setUploadState("creating");

      const createResponse =
        await fetch(
          "/api/bunny/upload",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              courseId,
            }),
          }
        );

      const createData =
        await createResponse.json();

      if (
        !createResponse.ok ||
        !createData.videoId
      ) {
        throw new Error(
          createData.error ||
            "تعذر تجهيز رفع Bunny"
        );
      }

      const videoId =
        createData.videoId;

      const libraryId =
        createData.libraryId;

      setBunnyVideoId(videoId);
      setBunnyLibraryId(libraryId);

      setUploadState("uploading");

      const uploadResponse =
        await fetch(
          `/api/bunny/upload/${videoId}`,
          {
            method: "PUT",
            headers: {
              "x-course-id":
                courseId,
              "Content-Type":
                file.type,
            },
            body: file,
          }
        );

      if (!uploadResponse.ok) {
        const error =
          await uploadResponse.json();

        throw new Error(
          error.error ||
            "فشل رفع الفيديو"
        );
      }

      setProgress(100);
      setUploadState("ready");

    } catch (error) {
      console.error(
        "BUNNY_UPLOAD_ERROR",
        error
      );

      setUploadState("error");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء رفع الفيديو"
      );
    }
  }

  const muxBusy =
    uploadState ===
      "creating" ||
    uploadState ===
      "uploading" ||
    uploadState ===
      "processing";

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name="video_provider"
        value={provider}
      />

      <input
        type="hidden"
        name="mux_asset_id"
        value={muxAssetId}
      />

      <input
        type="hidden"
        name="mux_playback_id"
        value={muxPlaybackId}
      />

      <input
        type="hidden"
        name="bunny_library_id"
        value={bunnyLibraryId}
      />

      <input
        type="hidden"
        name="bunny_video_id"
        value={bunnyVideoId}
      />

      <div>
        <p className="mb-2 text-sm font-bold text-slate-700">
          مصدر الفيديو
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={muxBusy}
            onClick={() =>
              setProvider(
                "youtube"
              )
            }
            className={`rounded-xl border p-4 text-center transition ${
              provider ===
              "youtube"
                ? "border-[#124b8a] bg-blue-50 text-[#124b8a] ring-2 ring-blue-100"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="block font-bold">
              YouTube
            </span>

            <span className="mt-1 block text-xs">
              رابط فيديو
            </span>
          </button>

          <button
            type="button"
            disabled={muxBusy}
            onClick={() =>
              setProvider("mux")
            }
            className={`rounded-xl border p-4 text-center transition ${
              provider === "mux"
                ? "border-[#124b8a] bg-blue-50 text-[#124b8a] ring-2 ring-blue-100"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="block font-bold">
              Mux
            </span>

            <span className="mt-1 block text-xs">
              فيديو محمي
            </span>
          </button>

          <button
            type="button"
            disabled={muxBusy}
            onClick={() =>
              setProvider("bunny")
            }
            className={`rounded-xl border p-4 text-center transition ${
              provider === "bunny"
                ? "border-[#124b8a] bg-blue-50 text-[#124b8a] ring-2 ring-blue-100"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="block font-bold">
              Bunny
            </span>

            <span className="mt-1 block text-xs">
              فيديو محمي
            </span>
          </button>
        </div>
      </div>

      {provider ===
      "youtube" ? (
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            رابط YouTube
          </label>

          <input
            name="youtube_url"
            type="url"
            required
            defaultValue={
              defaultYoutubeUrl
            }
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-xl border px-4 py-3 text-left"
            dir="ltr"
          />

          <p className="mt-2 text-xs text-slate-400">
            يدعم روابط YouTube
            العادية و Shorts و
            youtu.be
          </p>
        </div>
      ) : provider === "mux" ? (
        <div className="space-y-4 rounded-2xl border border-violet-100 bg-violet-50 p-5">
          <div>
            <p className="font-bold text-violet-950">
              فيديو Mux المحمي
            </p>

            <p className="mt-1 text-xs leading-6 text-violet-700">
              اختر الفيديو وسيتم
              رفعه مباشرة من جهازك
              إلى Mux.
            </p>
          </div>

          <label
            className={`block cursor-pointer rounded-xl border-2 border-dashed border-violet-200 bg-white p-6 text-center transition hover:border-violet-400 ${
              muxBusy
                ? "pointer-events-none opacity-60"
                : ""
            }`}
          >
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={muxBusy}
              onChange={
                handleMuxFile
              }
            />

            <span className="block text-2xl">
              🎬
            </span>

            <span className="mt-2 block font-bold text-slate-800">
              {muxBusy
                ? "جاري العمل..."
                : muxPlaybackId
                  ? "استبدال الفيديو"
                  : "اختر فيديو من جهازك"}
            </span>

            <span className="mt-1 block text-xs text-slate-500">
              MP4 أو أي صيغة فيديو
              مدعومة
            </span>
          </label>

          {fileName && (
            <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
              {fileName}
            </div>
          )}

          {uploadState ===
            "creating" && (
            <div className="rounded-xl bg-white p-4 text-sm font-bold text-violet-700">
              جاري تجهيز رابط
              الرفع...
            </div>
          )}

          {uploadState ===
            "uploading" && (
            <div className="space-y-2 rounded-xl bg-white p-4">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>
                  جاري رفع الفيديو
                </span>

                <span dir="ltr">
                  {progress}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {uploadState ===
            "processing" && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="font-bold text-blue-800">
                ✅ تم رفع الملف
              </p>

              <p className="mt-1 text-sm text-blue-700">
                Mux يعالج الفيديو
                الآن. لا تغلق الصفحة.
              </p>
            </div>
          )}

          {uploadState ===
            "ready" &&
            muxPlaybackId && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-bold text-emerald-800">
                  ✅ الفيديو جاهز
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  تم حفظ بيانات
                  التشغيل تلقائيًا.
                </p>
              </div>
            )}

          {uploadState ===
            "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-700">
                ❌ فشل رفع الفيديو
              </p>

              <p className="mt-1 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          )}

          {!muxPlaybackId &&
            uploadState ===
              "idle" && (
              <p className="text-xs font-medium text-violet-700">
                يجب رفع الفيديو
                وانتظار ظهور
                &quot;الفيديو
                جاهز&quot; قبل حفظ
                الدرس.
              </p>
            )}
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <div>
            <p className="font-bold text-orange-950">
              فيديو Bunny Stream
            </p>

            <p className="mt-1 text-xs leading-6 text-orange-700">
              اختر الفيديو وسيتم رفعه مباشرة إلى Bunny.
            </p>
          </div>

          <label
            className={`block cursor-pointer rounded-xl border-2 border-dashed border-orange-200 bg-white p-6 text-center transition hover:border-orange-400 ${
              muxBusy
                ? "pointer-events-none opacity-60"
                : ""
            }`}
          >
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={muxBusy}
              onChange={handleBunnyFile}
            />

            <span className="block text-2xl">
              🐰
            </span>

            <span className="mt-2 block font-bold text-slate-800">
              {muxBusy
                ? "جاري العمل..."
                : bunnyVideoId
                  ? "استبدال الفيديو"
                  : "اختر فيديو من جهازك"}
            </span>

            <span className="mt-1 block text-xs text-slate-500">
              MP4 أو أي صيغة فيديو مدعومة
            </span>
          </label>

          {fileName && (
            <div className="rounded-xl bg-white p-3 text-sm text-slate-700">
              {fileName}
            </div>
          )}

          {uploadState === "uploading" && (
            <div className="rounded-xl bg-white p-4">
              جاري رفع الفيديو {progress}%
            </div>
          )}

          {uploadState === "ready" &&
            bunnyVideoId && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-bold text-emerald-800">
                  ✅ الفيديو جاهز
                </p>
              </div>
            )}

          {uploadState === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-700">
                ❌ فشل رفع الفيديو
              </p>

              <p className="mt-1 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
