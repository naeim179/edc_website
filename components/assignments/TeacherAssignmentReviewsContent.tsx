"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/LanguageProvider";


type AssignmentItem = {
  id: string;
  title: string;
  courseTitle: string;
  maxScore: number;
  totalSubmissions: number;
  waitingReview: number;
  graded: number;
};


export default function TeacherAssignmentReviewsContent({
  assignments,
}: {
  assignments:
    AssignmentItem[];
}) {
  const {
    language,
    t,
  } =
    useLanguage();

  const copy =
    t.assignmentGrading;

  return (
    <div
      dir={
        language ===
        "ar"
          ? "rtl"
          : "ltr"
      }
      className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-[var(--brand-text)]">
          {
            copy.pageTitle
          }
        </h1>

        <p className="mt-2 text-[var(--brand-text-muted)]">
          {
            copy.pageDescription
          }
        </p>
      </div>

      {assignments.length ===
      0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] p-10 text-center text-[var(--brand-text-muted)]">
          {
            copy.noAssignments
          }
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {assignments.map(
            (
              assignment
            ) => (
              <article
                key={
                  assignment.id
                }
                className="rounded-[26px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-sm"
              >
                <p className="text-sm font-bold text-[var(--brand-text-muted)]">
                  {
                    assignment.courseTitle
                  }
                </p>

                <h2 className="mt-1 text-xl font-bold text-[var(--brand-text)]">
                  {
                    assignment.title
                  }
                </h2>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-slate-500">
                      {
                        copy.submissions
                      }
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {
                        assignment.totalSubmissions
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-3 text-center">
                    <p className="text-xs text-amber-700">
                      {
                        copy.waitingReview
                      }
                    </p>

                    <p className="mt-1 text-xl font-bold text-amber-800">
                      {
                        assignment.waitingReview
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-emerald-700">
                      {
                        copy.graded
                      }
                    </p>

                    <p className="mt-1 text-xl font-bold text-emerald-800">
                      {
                        assignment.graded
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-sm text-[var(--brand-text-muted)]">
                  {
                    copy.maxScore
                  }
                  :{" "}
                  <strong>
                    {
                      assignment.maxScore
                    }
                  </strong>
                </div>

                <Link
                  href={`/teacher/assignment-submissions/${assignment.id}`}
                  className="mt-5 flex items-center justify-center rounded-2xl bg-[#1B4B43] px-5 py-3 font-bold text-white transition hover:bg-[#123F39]"
                >
                  {
                    copy.reviewSubmissions
                  }
                </Link>
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}
