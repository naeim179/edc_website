"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import {
  formatAssignmentDate,
} from "@/lib/format-assignment-date";


type Assignment = {
  id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  max_score: number;
  courseTitle: string;
  status: string | null;
  score: number | null;
};


export default function StudentAssignmentsContent({
  assignments,
}: {
  assignments:
    Assignment[];
}) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.assignments;


  function statusLabel(
    status: string | null
  ) {
    if (
      status ===
      "graded"
    ) {
      return copy.graded;
    }

    if (
      status ===
      "submitted"
    ) {
      return copy.submitted;
    }

    if (
      status ===
      "late"
    ) {
      return copy.submittedLate;
    }

    if (
      status ===
      "returned"
    ) {
      return copy.returned;
    }

    if (
      status ===
      "draft"
    ) {
      return copy.draft;
    }

    return copy.notStarted;
  }


  return (
    <div
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="mx-auto w-full max-w-6xl space-y-6"
    >
      <section className="rounded-[30px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-7 text-white">
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
          {
            copy.studentCenter
          }
        </span>

        <h1 className="mt-4 text-3xl font-bold">
          {copy.myAssignments}
        </h1>

        <p className="mt-2 text-white/70">
          {
            copy.studentSubtitle
          }
        </p>
      </section>


      {assignments.length ===
      0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] p-12 text-center text-[var(--brand-text-muted)]">
          {
            copy.noStudentAssignments
          }
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {assignments.map(
            (
              assignment
            ) => (
              <article
                key={
                  assignment.id
                }
                className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-sm"
              >
                <span className="rounded-full bg-[#EEF5F2] px-3 py-1 text-xs font-bold text-[#1B4B43]">
                  {
                    assignment.courseTitle
                  }
                </span>

                <h2 className="mt-4 text-xl font-bold text-[var(--brand-text)]">
                  {
                    assignment.title
                  }
                </h2>

                <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--brand-text-muted)]">
                  {
                    assignment.instructions ||
                    copy.noInstructions
                  }
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {
                      assignment.max_score
                    }{" "}
                    {copy.points}
                  </span>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {assignment.due_at
                      ? formatAssignmentDate(
                          assignment.due_at,
                          language
                        )
                      : copy.noDeadline}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {statusLabel(
                      assignment.status
                    )}
                  </span>
                </div>

                {assignment.status ===
                  "graded" &&
                  assignment.score !=
                    null && (
                    <div className="mt-4 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-700">
                      {
                        copy.score
                      }
                      :{" "}
                      {
                        assignment.score
                      }{" "}
                      /{" "}
                      {
                        assignment.max_score
                      }
                    </div>
                  )}

                <Link
                  href={`/assignments/${assignment.id}`}
                  className="mt-5 flex items-center justify-center rounded-xl bg-[#1B4B43] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#123F39]"
                >
                  {copy.openAssignment}
                </Link>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}
