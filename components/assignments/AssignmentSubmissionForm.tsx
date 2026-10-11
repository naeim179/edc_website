"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  saveAssignmentDraft,
  submitAssignment,
} from "@/app/actions/assignment-submissions";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import {
  formatAssignmentDate,
} from "@/lib/format-assignment-date";


type StoredFile = {
  path: string;
  name: string;
  size: number;
  type: string;
  url?: string | null;
};

type StoredAudio =
  StoredFile & {
    duration?: number;
  };

type Props = {
  assignment: {
    id: string;
    courseId: string;
    courseTitle: string;
    title: string;
    instructions: string;
    dueAt: string | null;
    maxScore: number;
    allowLate: boolean;
    maxAttempts: number;
  };

  studentId: string;

  submission: {
    status: string | null;
    attemptNumber: number;
    text: string;
    links: string[];
    files: StoredFile[];
    audio: StoredAudio[];
    score: number | null;
    feedback: string | null;
  };
};


const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const MAX_FILES = 5;


function readableSize(
  bytes: number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}


function safeName(
  name: string
) {
  return name
    .replace(
      /[^a-zA-Z0-9._-]+/g,
      "_"
    )
    .slice(-140);
}


function formatDuration(
  seconds = 0
) {
  const minutes =
    Math.floor(
      seconds / 60
    );

  const remaining =
    seconds % 60;

  return `${minutes}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
}


export default function AssignmentSubmissionForm({
  assignment,
  studentId,
  submission,
}: Props) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.assignments;

  const router =
    useRouter();

  const [
    text,
    setText,
  ] =
    useState(
      submission.text
    );

  const [
    linksText,
    setLinksText,
  ] =
    useState(
      submission.links.join(
        "\n"
      )
    );

  const [
    storedFiles,
    setStoredFiles,
  ] =
    useState(
      submission.files
    );

  const [
    storedAudio,
    setStoredAudio,
  ] =
    useState(
      submission.audio
    );

  const [
    pendingFiles,
    setPendingFiles,
  ] =
    useState<File[]>(
      []
    );

  const [
    recordedAudio,
    setRecordedAudio,
  ] =
    useState<File | null>(
      null
    );

  const [
    audioDuration,
    setAudioDuration,
  ] =
    useState(0);

  const [
    currentStatus,
    setCurrentStatus,
  ] =
    useState(
      submission.status
    );

  const [
    currentAttempt,
    setCurrentAttempt,
  ] =
    useState(
      submission.attemptNumber
    );

  const [
    busy,
    setBusy,
  ] =
    useState<
      "save" |
      "submit" |
      null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    removedPaths,
    setRemovedPaths,
  ] =
    useState<string[]>(
      []
    );

  const [
    recording,
    setRecording,
  ] =
    useState(false);

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] =
    useState(0);

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const chunksRef =
    useRef<Blob[]>(
      []
    );

  const timerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > |
      null
    >(null);


  const localAudioUrl =
    useMemo(
      () =>
        recordedAudio
          ? URL.createObjectURL(
              recordedAudio
            )
          : null,
      [recordedAudio]
    );


  useEffect(
    () => {
      return () => {
        if (
          localAudioUrl
        ) {
          URL.revokeObjectURL(
            localAudioUrl
          );
        }

        if (
          timerRef.current
        ) {
          clearInterval(
            timerRef.current
          );
        }

        streamRef.current
          ?.getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      };
    },
    [localAudioUrl]
  );


  const graded =
    currentStatus ===
    "graded";

  const alreadySubmitted =
    currentStatus ===
      "submitted" ||
    currentStatus ===
      "late";


  const [
    nowMs,
    setNowMs,
  ] =
    useState<number | null>(
      null
    );


  useEffect(
    () => {
      setNowMs(
        Date.now()
      );

      const timer =
        setInterval(
          () => {
            setNowMs(
              Date.now()
            );
          },
          30000
        );

      return () =>
        clearInterval(
          timer
        );
    },
    []
  );


  const deadlinePassed =
    Boolean(
      nowMs !== null &&
      assignment.dueAt &&
      nowMs >
        new Date(
          assignment.dueAt
        ).getTime()
    );


  const deadlineClosed =
    deadlinePassed &&
    !assignment.allowLate;


  const noAttempts =
    assignment.maxAttempts >
      0 &&
    currentAttempt >=
      assignment.maxAttempts;


  const canEdit =
    !graded &&
    !deadlineClosed &&
    !noAttempts;


  const canSaveDraft =
    canEdit &&
    !alreadySubmitted;


  function parseLinks() {
    const links =
      linksText
        .split("\n")
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean);

    if (
      links.length > 5
    ) {
      throw new Error(
        copy.tooManyLinks
      );
    }

    for (
      const item of links
    ) {
      try {
        const url =
          new URL(item);

        if (
          url.protocol !==
            "http:" &&
          url.protocol !==
            "https:"
        ) {
          throw new Error();
        }
      } catch {
        throw new Error(
          copy.invalidLink
        );
      }
    }

    return links;
  }


  function chooseFiles(
    files:
      FileList | null
  ) {
    if (!files) {
      return;
    }

    const selected =
      Array.from(files);

    if (
      storedFiles.length +
        pendingFiles.length +
        selected.length >
      MAX_FILES
    ) {
      setError(
        copy.tooManyFiles
      );

      return;
    }

    if (
      selected.some(
        (file) =>
          file.size >
          MAX_FILE_SIZE
      )
    ) {
      setError(
        copy.fileTooLarge
      );

      return;
    }

    setError("");

    setPendingFiles(
      (current) => [
        ...current,
        ...selected,
      ]
    );
  }


  function removeStoredFile(
    path: string
  ) {
    setStoredFiles(
      (current) =>
        current.filter(
          (item) =>
            item.path !==
            path
        )
    );

    setRemovedPaths(
      (current) => [
        ...current,
        path,
      ]
    );
  }


  function removeStoredAudio(
    path: string
  ) {
    setStoredAudio(
      (current) =>
        current.filter(
          (item) =>
            item.path !==
            path
        )
    );

    setRemovedPaths(
      (current) => [
        ...current,
        path,
      ]
    );
  }


  async function startRecording() {
    if (
      !navigator.mediaDevices ||
      !window.MediaRecorder
    ) {
      setError(
        copy.recordingUnsupported
      );

      return;
    }

    try {
      setError("");

      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: true,
          });

      streamRef.current =
        stream;

      const preferred =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find(
          (type) =>
            MediaRecorder.isTypeSupported(
              type
            )
        );

      const recorder =
        preferred
          ? new MediaRecorder(
              stream,
              {
                mimeType:
                  preferred,
              }
            )
          : new MediaRecorder(
              stream
            );

      chunksRef.current =
        [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data.size >
            0
          ) {
            chunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop =
        () => {
          const mime =
            recorder.mimeType ||
            "audio/webm";

          const extension =
            mime.includes(
              "ogg"
            )
              ? "ogg"
              : mime.includes(
                    "mp4"
                  )
                ? "m4a"
                : "webm";

          const blob =
            new Blob(
              chunksRef.current,
              {
                type: mime,
              }
            );

          if (
            blob.size >
            MAX_FILE_SIZE
          ) {
            setError(
              copy.audioTooLarge
            );

            return;
          }

          const file =
            new File(
              [blob],
              `voice-${Date.now()}.${extension}`,
              {
                type: mime,
              }
            );

          setRecordedAudio(
            file
          );

          setAudioDuration(
            recordingSeconds
          );
        };

      mediaRecorderRef.current =
        recorder;

      setRecordingSeconds(
        0
      );

      recorder.start(
        1000
      );

      setRecording(
        true
      );

      timerRef.current =
        setInterval(
          () => {
            setRecordingSeconds(
              (seconds) =>
                seconds + 1
            );
          },
          1000
        );
    } catch {
      setError(
        copy.microphoneDenied
      );
    }
  }


  function stopRecording() {
    if (
      mediaRecorderRef
        .current?.state ===
      "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    streamRef.current
      ?.getTracks()
      .forEach(
        (track) =>
          track.stop()
      );

    streamRef.current =
      null;

    if (
      timerRef.current
    ) {
      clearInterval(
        timerRef.current
      );

      timerRef.current =
        null;
    }

    setRecording(
      false
    );
  }


  async function uploadOne(
    file: File,
    kind:
      | "file"
      | "audio"
  ) {
    const supabase =
      createClient();

    const extensionName =
      safeName(
        file.name
      );

    const random =
      typeof crypto !==
        "undefined" &&
      "randomUUID" in
        crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const path =
      `submissions/${assignment.courseId}/${assignment.id}/${studentId}/${kind}-${random}-${extensionName}`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          "assignment-files"
        )
        .upload(
          path,
          file,
          {
            upsert:
              false,
            contentType:
              file.type ||
              undefined,
          }
        );

    if (
      uploadError
    ) {
      throw new Error(
        copy.uploadError
      );
    }

    return {
      path,
      name:
        file.name,
      size:
        file.size,
      type:
        file.type ||
        "application/octet-stream",
    };
  }


  async function addSignedUrl<
    T extends StoredFile
  >(
    item: T
  ): Promise<T> {
    const supabase =
      createClient();

    const {
      data,
    } =
      await supabase.storage
        .from(
          "assignment-files"
        )
        .createSignedUrl(
          item.path,
          3600
        );

    return {
      ...item,
      url:
        data
          ?.signedUrl ??
        null,
    };
  }


  async function buildContent() {
    const uploadedPaths:
      string[] = [];

    try {
      const links =
        parseLinks();

      const newFiles =
        [];

      for (
        const file of
        pendingFiles
      ) {
        const item =
          await uploadOne(
            file,
            "file"
          );

        uploadedPaths.push(
          item.path
        );

        newFiles.push(
          item
        );
      }

      let newAudio:
        StoredAudio[] = [];

      if (
        recordedAudio
      ) {
        const item =
          await uploadOne(
            recordedAudio,
            "audio"
          );

        uploadedPaths.push(
          item.path
        );

        newAudio = [
          {
            ...item,
            duration:
              audioDuration,
          },
        ];
      }

      return {
        content: {
          text:
            text.trim(),
          links,
          files: [
            ...storedFiles.map(
              ({
                url,
                ...item
              }) => item
            ),
            ...newFiles,
          ],
          audio: [
            ...storedAudio.map(
              ({
                url,
                ...item
              }) => item
            ),
            ...newAudio,
          ].slice(-1),
        },

        newFiles,
        newAudio,
        uploadedPaths,
      };
    } catch (
      buildError
    ) {
      if (
        uploadedPaths.length
      ) {
        const supabase =
          createClient();

        await supabase.storage
          .from(
            "assignment-files"
          )
          .remove(
            uploadedPaths
          );
      }

      throw buildError;
    }
  }


  async function removeOldObjects() {
    if (
      removedPaths.length ===
      0
    ) {
      return;
    }

    const supabase =
      createClient();

    await supabase.storage
      .from(
        "assignment-files"
      )
      .remove(
        removedPaths
      );

    setRemovedPaths(
      []
    );
  }


  async function save() {
    if (
      !canSaveDraft
    ) {
      return;
    }

    setBusy(
      "save"
    );

    setError("");
    setMessage("");

    let uploaded:
      string[] = [];

    try {
      const built =
        await buildContent();

      uploaded =
        built.uploadedPaths;

      await saveAssignmentDraft(
        assignment.id,
        built.content
      );

      await removeOldObjects();

      const nextFiles =
        await Promise.all(
          [
            ...storedFiles,
            ...built.newFiles,
          ].map(
            addSignedUrl
          )
        );

      const nextAudio =
        await Promise.all(
          [
            ...storedAudio,
            ...built.newAudio,
          ]
            .slice(-1)
            .map(
              addSignedUrl
            )
        );

      setStoredFiles(
        nextFiles
      );

      setStoredAudio(
        nextAudio
      );

      setPendingFiles(
        []
      );

      setRecordedAudio(
        null
      );

      setAudioDuration(
        0
      );

      if (
        currentStatus !==
        "returned"
      ) {
        setCurrentStatus(
          "draft"
        );
      }

      setMessage(
        copy.draftSaved
      );

      router.refresh();
    } catch (
      saveError
    ) {
      if (
        uploaded.length
      ) {
        await createClient()
          .storage
          .from(
            "assignment-files"
          )
          .remove(
            uploaded
          );
      }

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : copy.saveError
      );
    } finally {
      setBusy(
        null
      );
    }
  }


  async function submit() {
    if (
      !canEdit
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        copy.submitConfirm
      );

    if (!confirmed) {
      return;
    }

    setBusy(
      "submit"
    );

    setError("");
    setMessage("");

    let uploaded:
      string[] = [];

    try {
      const built =
        await buildContent();

      uploaded =
        built.uploadedPaths;

      const result =
        await submitAssignment(
          assignment.id,
          built.content
        );

      await removeOldObjects();

      setPendingFiles(
        []
      );

      setRecordedAudio(
        null
      );

      setCurrentStatus(
        result.status
      );

      setCurrentAttempt(
        result.attemptNumber
      );

      setMessage(
        copy.submittedSuccess
      );

      router.refresh();
    } catch (
      submitError
    ) {
      if (
        uploaded.length
      ) {
        await createClient()
          .storage
          .from(
            "assignment-files"
          )
          .remove(
            uploaded
          );
      }

      setError(
        submitError instanceof
          Error
          ? submitError.message
          : copy.submitError
      );
    } finally {
      setBusy(
        null
      );
    }
  }


  const statusText =
    currentStatus ===
    "graded"
      ? copy.graded
      : currentStatus ===
          "submitted"
        ? copy.submitted
        : currentStatus ===
            "late"
          ? copy.submittedLate
          : currentStatus ===
              "returned"
            ? copy.returned
            : currentStatus ===
                "draft"
              ? copy.draft
              : copy.notStarted;


  return (
    <div
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      <Link
        href="/assignments"
        className="inline-flex text-sm font-bold text-[var(--brand-text-muted)] hover:text-[var(--brand-ink)]"
      >
        ←{" "}
        {
          copy.backToAssignments
        }
      </Link>


      <section className="overflow-hidden rounded-[30px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-6 text-white sm:p-8">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
          {
            assignment.courseTitle
          }
        </span>

        <h1 className="mt-4 text-3xl font-bold">
          {
            assignment.title
          }
        </h1>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1.5">
            {
              assignment.maxScore
            }{" "}
            {
              copy.points
            }
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1.5">
            {assignment.dueAt
              ? `${copy.deadline}: ${formatAssignmentDate(
                  assignment.dueAt,
                  language
                )}`
              : copy.noDeadline}
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold">
            {copy.status}:{" "}
            {
              statusText
            }
          </span>
        </div>
      </section>


      <section className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--brand-text)]">
          {
            copy.instructions
          }
        </h2>

        <p className="mt-3 whitespace-pre-line leading-8 text-[var(--brand-text-muted)]">
          {
            assignment.instructions ||
            copy.noInstructions
          }
        </p>
      </section>


      {submission.score !=
        null && (
        <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">
            {
              copy.score
            }
            :{" "}
            {
              submission.score
            }{" "}
            /{" "}
            {
              assignment.maxScore
            }
          </p>

          {submission.feedback && (
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-emerald-700">
              {
                submission.feedback
              }
            </p>
          )}
        </section>
      )}


      {alreadySubmitted &&
        canEdit && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {
            copy.resubmitAvailable
          }
        </div>
      )}

      {graded && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {
            copy.submissionLocked
          }
        </div>
      )}

      {currentStatus ===
        "returned" &&
        submission.feedback && (
        <div
          data-testid="returned-feedback-card"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
        >
          <p className="font-bold text-blue-800">
            {isArabic
              ? "ملاحظات المدرس"
              : "Teacher Feedback"}
          </p>

          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-blue-700">
            {
              submission.feedback
            }
          </p>
        </div>
      )}

      {deadlineClosed && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {
            copy.deadlineClosed
          }
        </div>
      )}

      {noAttempts && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
          {
            copy.noAttempts
          }
        </div>
      )}


      <section className="space-y-6 rounded-[28px] border border-[#E1E8E4] bg-white p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="text-xl font-bold text-[#24332E]">
            {
              copy.yourAnswer
            }
          </h2>

          <p className="mt-1 text-sm text-[#7B8882]">
            {
              copy.answerHint
            }
          </p>
        </div>


        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[#24332E]">
            ✍️{" "}
            {
              copy.writtenAnswer
            }
          </span>

          <textarea
            value={
              text
            }
            disabled={
              !canEdit
            }
            onChange={(
              event
            ) =>
              setText(
                event
                  .target
                  .value
              )
            }
            rows={
              8
            }
            maxLength={
              20000
            }
            placeholder={
              copy.writtenPlaceholder
            }
            className="w-full resize-y rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 leading-7 text-[#24332E] outline-none disabled:opacity-60"
          />
        </label>


        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[#24332E]">
            🔗{" "}
            {
              copy.links
            }
          </span>

          <textarea
            value={
              linksText
            }
            disabled={
              !canEdit
            }
            onChange={(
              event
            ) =>
              setLinksText(
                event
                  .target
                  .value
              )
            }
            rows={
              3
            }
            placeholder={
              copy.linksPlaceholder
            }
            className="w-full resize-y rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none disabled:opacity-60"
          />

          <p className="mt-1 text-xs text-[#8C9892]">
            {
              copy.linksHint
            }
          </p>
        </label>


        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#24332E]">
                📎{" "}
                {
                  copy.attachments
                }
              </p>

              <p className="mt-1 text-xs text-[#8C9892]">
                {
                  copy.fileHint
                }
              </p>
            </div>

            <span className="rounded-full bg-[#F3F6F4] px-3 py-1 text-xs font-bold text-[#1B4B43]">
              {storedFiles.length +
                pendingFiles.length}{" "}
              /{" "}
              {
                MAX_FILES
              }
            </span>
          </div>


          {storedFiles.length >
            0 && (
            <div className="mt-3 space-y-2">
              {storedFiles.map(
                (
                  file
                ) => (
                  <div
                    key={
                      file.path
                    }
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E1E8E4] bg-[#FAFCFB] p-3"
                  >
                    <div className="min-w-0">
                      {file.url ? (
                        <a
                          href={
                            file.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-bold text-[#1B4B43] hover:underline"
                        >
                          {
                            file.name
                          }
                        </a>
                      ) : (
                        <p className="truncate font-bold text-[#24332E]">
                          {
                            file.name
                          }
                        </p>
                      )}

                      <p className="text-xs text-[#8C9892]">
                        {readableSize(
                          file.size
                        )}
                      </p>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          removeStoredFile(
                            file.path
                          )
                        }
                        className="text-sm font-bold text-red-600"
                      >
                        {
                          copy.remove
                        }
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          )}


          {pendingFiles.length >
            0 && (
            <div className="mt-3 space-y-2">
              {pendingFiles.map(
                (
                  file,
                  index
                ) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-xl bg-amber-50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-amber-800">
                        {
                          file.name
                        }
                      </p>

                      <p className="text-xs text-amber-600">
                        {readableSize(
                          file.size
                        )}
                        {" • "}
                        {
                          copy.pendingUpload
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPendingFiles(
                          (
                            current
                          ) =>
                            current.filter(
                              (
                                _,
                                itemIndex
                              ) =>
                                itemIndex !==
                                index
                            )
                        )
                      }
                      className="text-sm font-bold text-red-600"
                    >
                      {
                        copy.remove
                      }
                    </button>
                  </div>
                )
              )}
            </div>
          )}


          {canEdit && (
            <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#C9D8D1] bg-[#FAFCFB] px-5 py-5 text-sm font-bold text-[#1B4B43] transition hover:bg-[#F2F7F4]">
              +{" "}
              {
                copy.addFiles
              }

              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                className="hidden"
                onChange={(
                  event
                ) => {
                  chooseFiles(
                    event
                      .target
                      .files
                  );

                  event.target.value =
                    "";
                }}
              />
            </label>
          )}
        </div>


        <div>
          <p className="text-sm font-bold text-[#24332E]">
            🎙️{" "}
            {
              copy.voiceAnswer
            }
          </p>

          <p className="mt-1 text-xs text-[#8C9892]">
            {
              copy.voiceHint
            }
          </p>


          {storedAudio.map(
            (
              audio
            ) => (
              <div
                key={
                  audio.path
                }
                className="mt-3 rounded-2xl border border-[#DCE5E0] bg-[#FAFCFB] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#24332E]">
                    {
                      copy.savedRecording
                    }
                    {audio.duration
                      ? ` • ${formatDuration(
                          audio.duration
                        )}`
                      : ""}
                  </p>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        removeStoredAudio(
                          audio.path
                        )
                      }
                      className="text-sm font-bold text-red-600"
                    >
                      {
                        copy.remove
                      }
                    </button>
                  )}
                </div>

                {audio.url && (
                  <audio
                    controls
                    preload="metadata"
                    src={
                      audio.url
                    }
                    className="mt-3 w-full"
                  />
                )}
              </div>
            )
          )}


          {recordedAudio && (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-emerald-800">
                  {
                    copy.newRecording
                  }{" "}
                  •{" "}
                  {formatDuration(
                    audioDuration
                  )}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setRecordedAudio(
                      null
                    );

                    setAudioDuration(
                      0
                    );
                  }}
                  className="text-sm font-bold text-red-600"
                >
                  {
                    copy.remove
                  }
                </button>
              </div>

              {localAudioUrl && (
                <audio
                  controls
                  src={
                    localAudioUrl
                  }
                  className="mt-3 w-full"
                />
              )}
            </div>
          )}


          {canEdit &&
            storedAudio.length ===
              0 &&
            !recordedAudio && (
              <button
                type="button"
                onClick={
                  recording
                    ? stopRecording
                    : startRecording
                }
                className={`mt-3 w-full rounded-2xl px-5 py-4 font-bold transition ${
                  recording
                    ? "bg-red-600 text-white"
                    : "border border-[#D5E0DB] bg-[#F6F9F7] text-[#1B4B43]"
                }`}
              >
                {recording
                  ? `■ ${copy.stopRecording} • ${formatDuration(
                      recordingSeconds
                    )}`
                  : `🎙 ${copy.startRecording}`}
              </button>
            )}
        </div>


        <div className="rounded-2xl bg-[#F6F3EC] p-4 text-sm text-[#746A5F]">
          {copy.attempts}:{" "}
          <strong>
            {
              currentAttempt
            }
          </strong>

          {" / "}

          <strong>
            {assignment.maxAttempts ===
            0
              ? copy.unlimited
              : assignment.maxAttempts}
          </strong>
        </div>


        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}


        {canEdit && (
          <div
            className={`grid gap-3 ${
              canSaveDraft
                ? "sm:grid-cols-2"
                : ""
            }`}
          >
            {canSaveDraft && (
              <button
                type="button"
                onClick={
                  save
                }
                disabled={
                  busy !==
                    null ||
                  recording
                }
                className="rounded-2xl border border-[#1B4B43] bg-white px-6 py-3.5 font-bold text-[#1B4B43] disabled:opacity-50"
              >
                {busy ===
                "save"
                  ? copy.savingDraft
                  : copy.saveDraft}
              </button>
            )}

            <button
              type="button"
              onClick={
                submit
              }
              disabled={
                busy !==
                  null ||
                recording ||
                deadlineClosed ||
                noAttempts
              }
              className="rounded-2xl bg-[#C9704A] px-6 py-3.5 font-bold text-white shadow-[0_10px_25px_rgba(201,112,74,0.18)] disabled:opacity-40"
            >
              {busy ===
              "submit"
                ? alreadySubmitted
                  ? copy.resubmitting
                  : copy.submitting
                : alreadySubmitted
                  ? copy.resubmitAssignment
                  : copy.submitAssignment}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
