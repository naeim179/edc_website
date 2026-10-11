"use client";

import Link from "next/link";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import AssignmentSubmissionReviewCard from "@/components/assignments/AssignmentSubmissionReviewCard";


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


type Submission = {
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


export default function TeacherAssignmentSubmissionList({
  assignment,
  submissions,
}: {
  assignment: {
    id: string;
    title: string;
    courseTitle: string;
    maxScore: number;
  };

  submissions:
    Submission[];
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
      <Link
        href="/teacher/assignment-submissions"
        className="inline-flex text-sm font-bold text-[var(--brand-text-muted)] hover:text-[var(--brand-ink)]"
      >
        ←{" "}
        {
          copy.back
        }
      </Link>

      <div className="rounded-[28px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-6 text-white sm:p-8">
        <p className="text-sm font-bold text-white/75">
          {
            assignment.courseTitle
          }
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {
            assignment.title
          }
        </h1>

        <p className="mt-3 text-white/80">
          {
            copy.maxScore
          }
          :{" "}
          {
            assignment.maxScore
          }
        </p>
      </div>

      {submissions.length ===
      0 ? (
        <div className="rounded-[24px] border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] p-10 text-center text-[var(--brand-text-muted)]">
          {
            copy.noSubmissions
          }
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.map(
            (
              submission
            ) => (
              <AssignmentSubmissionReviewCard
                key={
                  submission.id
                }
                assignmentId={
                  assignment.id
                }
                maxScore={
                  assignment.maxScore
                }
                submission={
                  submission
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
