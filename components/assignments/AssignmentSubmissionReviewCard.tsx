"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import {
  gradeAssignmentSubmission,
  returnAssignmentSubmission,
} from "@/app/actions/assignment-grading";


type FileItem = {
  path: string;
  name: string;
  size: number;
  type: string;
  url: string | null;
};

type AudioItem =
  FileItem & {
    duration?:
      number;
  };


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
      bytes /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}


export default function AssignmentSubmissionReviewCard({
  assignmentId,
  maxScore,
  submission,
}: {
  assignmentId:
    string;

  maxScore:
    number;

  submission: {
    id: string;
    studentName: string;
    status: string;
    attemptNumber: number;
    submittedAt:
      string | null;
    text: string;
    links:
      string[];
    files:
      FileItem[];
    audio:
      AudioItem[];
    score:
      number | null;
    feedback:
      string | null;
  };
}) {
  const router =
    useRouter();

  const {
    language,
    t,
  } =
    useLanguage();

  const copy =
    t.assignmentGrading;

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  const [
    score,
    setScore,
  ] =
    useState(
      submission.score ==
      null
        ? ""
        : String(
            submission.score
          )
    );

  const [
    feedback,
    setFeedback,
  ] =
    useState(
      submission.feedback ??
        ""
    );

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


  const statusLabel =
    submission.status ===
    "graded"
      ? copy.graded
      : submission.status ===
          "late"
        ? copy.late
        : submission.status ===
            "returned"
          ? copy.returned
          : copy.submitted;


  function grade() {
    const parsed =
      Number(score);

    if (
      score.trim() ===
        "" ||
      !Number.isFinite(
        parsed
      ) ||
      parsed < 0 ||
      parsed >
        maxScore
    ) {
      setError(
        `${copy.scoreRange} 0 - ${maxScore}`
      );

      return;
    }

    setError("");
    setMessage("");

    startTransition(
      async () => {
        try {
          await gradeAssignmentSubmission(
            assignmentId,
            submission.id,
            parsed,
            feedback
          );

          setMessage(
            copy.gradeSaved
          );

          router.refresh();
        } catch (
          actionError
        ) {
          setError(
            actionError instanceof
              Error
              ? actionError.message
              : copy.actionError
          );
        }
      }
    );
  }


  function returnToStudent() {
    if (
      !feedback.trim()
    ) {
      setError(
        copy.feedbackRequired
      );

      return;
    }

    const confirmed =
      window.confirm(
        copy.returnConfirm
      );

    if (
      !confirmed
    ) {
      return;
    }

    setError("");
    setMessage("");

    startTransition(
      async () => {
        try {
          await returnAssignmentSubmission(
            assignmentId,
            submission.id,
            feedback
          );

          setMessage(
            copy.returnedSuccess
          );

          router.refresh();
        } catch (
          actionError
        ) {
          setError(
            actionError instanceof
              Error
              ? actionError.message
              : copy.actionError
          );
        }
      }
    );
  }


  const canGrade =
    submission.status !==
    "returned";


  return (
    <article
      dir={
        language ===
        "ar"
          ? "rtl"
          : "ltr"
      }
      className="overflow-hidden rounded-[28px] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-sm"
    >
      <div className="border-b border-[var(--brand-border)] bg-[var(--brand-bg)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[var(--brand-text)]">
              {
                submission.studentName
              }
            </h2>

            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
              {
                copy.attempt
              }
              :{" "}
              {
                submission.attemptNumber
              }
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              submission.status ===
              "graded"
                ? "bg-emerald-100 text-emerald-800"
                : submission.status ===
                    "returned"
                  ? "bg-blue-100 text-blue-800"
                  : submission.status ===
                      "late"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800"
            }`}
          >
            {
              statusLabel
            }
          </span>
        </div>
      </div>


      <div className="space-y-6 p-5 sm:p-6">
        <section>
          <h3 className="text-sm font-bold text-[var(--brand-text)]">
            {
              copy.writtenAnswer
            }
          </h3>

          <div className="mt-2 rounded-2xl bg-[var(--brand-bg)] p-4">
            <p className="whitespace-pre-wrap leading-7 text-[var(--brand-text)]">
              {submission.text ||
                copy.noWrittenAnswer}
            </p>
          </div>
        </section>


        {submission.links.length >
          0 && (
          <section>
            <h3 className="text-sm font-bold text-[var(--brand-text)]">
              {
                copy.links
              }
            </h3>

            <div className="mt-2 space-y-2">
              {submission.links.map(
                (
                  link,
                  index
                ) => (
                  <a
                    key={`${link}-${index}`}
                    href={
                      link
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="block break-all rounded-xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:underline"
                  >
                    {
                      link
                    }
                  </a>
                )
              )}
            </div>
          </section>
        )}


        {submission.files.length >
          0 && (
          <section>
            <h3 className="text-sm font-bold text-[var(--brand-text)]">
              {
                copy.attachments
              }
            </h3>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {submission.files.map(
                (
                  file
                ) => (
                  <div
                    key={
                      file.path
                    }
                    className="rounded-xl border border-[var(--brand-border)] p-3"
                  >
                    <p className="truncate text-sm font-bold text-[var(--brand-text)]">
                      {
                        file.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
                      {readableSize(
                        file.size
                      )}
                    </p>

                    {file.url && (
                      <a
                        href={
                          file.url
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-bold text-[var(--brand-ink)] hover:underline"
                      >
                        {
                          copy.openFile
                        }
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          </section>
        )}


        {submission.audio.length >
          0 && (
          <section>
            <h3 className="text-sm font-bold text-[var(--brand-text)]">
              {
                copy.voiceAnswer
              }
            </h3>

            {submission.audio.map(
              (
                audio
              ) => (
                <div
                  key={
                    audio.path
                  }
                  className="mt-2 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4"
                >
                  {audio.url ? (
                    <audio
                      controls
                      preload="metadata"
                      src={
                        audio.url
                      }
                      className="w-full"
                    />
                  ) : (
                    <p className="text-sm text-[var(--brand-text-muted)]">
                      {
                        copy.audioUnavailable
                      }
                    </p>
                  )}
                </div>
              )
            )}
          </section>
        )}


        <section className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 sm:p-5">
          <h3 className="font-bold text-[var(--brand-text)]">
            {
              copy.grading
            }
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
            <label>
              <span className="mb-2 block text-sm font-bold text-[var(--brand-text-muted)]">
                {
                  copy.score
                }
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={
                    maxScore
                  }
                  step="0.01"
                  value={
                    score
                  }
                  disabled={
                    pending ||
                    !canGrade
                  }
                  onChange={(
                    event
                  ) =>
                    setScore(
                      event.target.value
                    )
                  }
                  className="min-w-0 flex-1 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-3 outline-none disabled:opacity-50"
                />

                <span className="font-bold text-[var(--brand-text-muted)]">
                  /{" "}
                  {
                    maxScore
                  }
                </span>
              </div>
            </label>

            <label>
              <span className="mb-2 block text-sm font-bold text-[var(--brand-text-muted)]">
                {
                  copy.feedback
                }
              </span>

              <textarea
                rows={
                  4
                }
                maxLength={
                  5000
                }
                value={
                  feedback
                }
                disabled={
                  pending
                }
                onChange={(
                  event
                ) =>
                  setFeedback(
                    event.target.value
                  )
                }
                placeholder={
                  copy.feedbackPlaceholder
                }
                className="w-full resize-y rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 outline-none disabled:opacity-50"
              />
            </label>
          </div>


          {error && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">
              {
                error
              }
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              {
                message
              }
            </div>
          )}


          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={
                pending ||
                !canGrade
              }
              onClick={
                grade
              }
              className="rounded-xl bg-[var(--brand-ink)] px-5 py-3 font-bold text-[var(--brand-on-ink)] disabled:opacity-40"
            >
              {pending
                ? copy.saving
                : submission.status ===
                    "graded"
                  ? copy.updateGrade
                  : copy.saveGrade}
            </button>

            <button
              type="button"
              disabled={
                pending ||
                submission.status ===
                  "returned"
              }
              onClick={
                returnToStudent
              }
              className="rounded-xl border border-[var(--brand-ink)] bg-[var(--brand-surface)] px-5 py-3 font-bold text-[var(--brand-ink)] disabled:opacity-40"
            >
              {
                copy.returnToStudent
              }
            </button>
          </div>
        </section>
      </div>
    </article>
  );
}
