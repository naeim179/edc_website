"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { formatAssignmentDate } from "@/lib/format-assignment-date";
import type { StudentAssignmentHistory } from "@/lib/student-assignment-history";

export default function AssignmentHistoryContent({ result }: { result: StudentAssignmentHistory }) {
  const { language, t } = useLanguage();
  const copy = t.assignments;
  const statuses: Record<string, string> = {
    draft: copy.draft, submitted: copy.submitted, late: copy.submittedLate,
    graded: copy.graded, returned: copy.returned,
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5" dir={language === "ar" ? "rtl" : "ltr"}>
      <Link href="/assignments" className="inline-flex text-sm font-bold text-[var(--brand-ink)]">
        {copy.backToAssignments}
      </Link>
      <section className="space-y-4 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 sm:p-8">
        <p className="text-sm font-semibold text-[var(--brand-text-muted)]">{result.course_title}</p>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">{result.assignment_title}</h1>
        <h2 className="font-semibold text-[var(--brand-ink)]">{copy.historyOnly}</h2>
        <p className="text-[var(--brand-text-muted)]">
          {result.course_access ? copy.assignmentUnavailable : copy.subscriptionRequired}
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <dt className="text-sm text-[var(--brand-text-muted)]">{copy.status}</dt>
            <dd className="font-semibold">{statuses[result.status] ?? copy.submitted}</dd>
          </div>
          {result.submitted_at && (
            <div>
              <dt className="text-sm text-[var(--brand-text-muted)]">{copy.submittedOn}</dt>
              <dd>{formatAssignmentDate(result.submitted_at, language)}</dd>
            </div>
          )}
          {result.score !== null && (
            <div>
              <dt className="text-sm text-[var(--brand-text-muted)]">{copy.score}</dt>
              <dd className="font-semibold" dir="ltr">{result.score} / {result.max_score}</dd>
            </div>
          )}
        </dl>
        {result.feedback && (
          <div className="space-y-1 border-t border-[var(--brand-border)] pt-4">
            <h3 className="font-semibold">{t.assignmentGrading.feedback}</h3>
            <p className="whitespace-pre-wrap break-words text-[var(--brand-text-muted)]">{result.feedback}</p>
          </div>
        )}
        {!result.course_access && (
          <Link href={`/courses/${result.course_id}`} className="inline-flex min-h-11 items-center rounded-xl bg-[#1B4B43] px-4 py-2 font-bold text-white">
            {copy.renewAssignmentAccess}
          </Link>
        )}
      </section>
    </div>
  );
}
