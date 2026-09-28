"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  extendStudentSubscription,
  removeStudentEnrollment,
  resetStudentProgress,
} from "@/app/actions/admin-students";

type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string | null;
  isFree: boolean;
  completedLessons: number;
  subscription: {
    expiresAt: string | null;
    status: string;
  } | null;
};

type Props = {
  student: {
    id: string;
    fullName: string | null;
    createdAt: string;
  };
  enrollments: Enrollment[];
};

const QUICK_DAYS = [7, 15, 30];

export default function AdminStudentDetailContent({
  student,
  enrollments,
}: Props) {
  const { language, t } = useLanguage();
  const isArabic = language === "ar";

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) {
      return t.admin.noDate;
    }

    const date = new Date(expiresAt);
    const now = new Date();
    const active = date > now;

    const formatted = date.toLocaleDateString(
      isArabic ? "ar" : "en",
      { year: "numeric", month: "short", day: "numeric" }
    );

    if (active) {
      const daysLeft = Math.ceil(
        (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return isArabic
        ? `ينتهي في ${formatted} (${daysLeft} يوم متبقٍ)`
        : `Expires ${formatted} (${daysLeft} days left)`;
    }

    return isArabic
      ? `انتهى في ${formatted}`
      : `Expired on ${formatted}`;
  }

  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div
        className="rounded-2xl border p-6"
        style={{
          borderColor: "var(--brand-border)",
          backgroundColor: "var(--brand-surface)",
        }}
      >
        <Link
          href="/admin/students"
          className="text-sm font-semibold"
          style={{ color: "var(--brand-ink)" }}
        >
          {t.admin.backToStudents}
        </Link>

        <h1
          className="mt-4 text-2xl font-bold"
          style={{ color: "var(--brand-text)" }}
        >
          {student.fullName ??
            t.admin.noName}
        </h1>

        <p
          className="mt-2 text-sm"
          style={{ color: "var(--brand-text-muted)" }}
        >
          {t.admin.registered}: 
          {new Date(student.createdAt).toLocaleDateString(
            isArabic ? "ar" : "en"
          )}
        </p>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{
          borderColor: "var(--brand-border)",
          backgroundColor: "var(--brand-surface)",
        }}
      >
        <h2
          className="mb-5 text-xl font-bold"
          style={{ color: "var(--brand-text)" }}
        >
          {t.admin.enrolledCourses}
        </h2>

        {enrollments.length > 0 ? (
          <div className="space-y-4">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="space-y-4 rounded-xl border p-5"
                style={{ borderColor: "var(--brand-border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3
                      className="text-lg font-bold"
                      style={{ color: "var(--brand-text)" }}
                    >
                      {enrollment.courseTitle ??
                        t.admin.courseUnavailable}
                    </h3>

                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--brand-text-muted)" }}
                    >
                      {t.admin.completedLessons}: {enrollment.completedLessons}
                    </p>

                    {!enrollment.isFree && (
                      <p
                        className="mt-1 text-sm font-semibold"
                        style={{ color: "var(--brand-clay)" }}
                      >
                        {enrollment.subscription
                          ? formatExpiry(
                              enrollment.subscription.expiresAt
                            )
                          : t.admin.noSubscription}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form
                      action={resetStudentProgress.bind(
                        null,
                        student.id,
                        enrollment.id
                      )}
                    >
                      <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">
                        {t.admin.resetProgress}
                      </button>
                    </form>

                    <form
                      action={removeStudentEnrollment.bind(
                        null,
                        student.id,
                        enrollment.id
                      )}
                    >
                      <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
                        {t.admin.removeEnrollment}
                      </button>
                    </form>
                  </div>
                </div>

                {!enrollment.isFree && enrollment.subscription && (
                  <div
                    className="flex flex-wrap items-center gap-2 border-t pt-4"
                    style={{ borderColor: "var(--brand-border-soft)" }}
                  >
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--brand-text)" }}
                    >
                      t.admin.extendSubscription
                    </span>

                    {QUICK_DAYS.map((days) => (
                      <form
                        key={days}
                        action={extendStudentSubscription}
                      >
                        <input
                          type="hidden"
                          name="studentId"
                          value={student.id}
                        />
                        <input
                          type="hidden"
                          name="courseId"
                          value={enrollment.courseId}
                        />
                        <input
                          type="hidden"
                          name="days"
                          value={days}
                        />

                        <button
                          type="submit"
                          className="rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors"
                          style={{
                            borderColor: "var(--brand-ink)",
                            color: "var(--brand-ink)",
                          }}
                        >
                          {`+${days} ${t.admin.days}`}
                        </button>
                      </form>
                    ))}

                    <form
                      action={extendStudentSubscription}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="hidden"
                        name="studentId"
                        value={student.id}
                      />
                      <input
                        type="hidden"
                        name="courseId"
                        value={enrollment.courseId}
                      />

                      <input
                        type="number"
                        name="days"
                        min={1}
                        placeholder={
                          t.admin.days
                        }
                        required
                        className="w-24 rounded-lg border px-2 py-1.5 text-sm"
                        style={{
                          borderColor: "var(--brand-border)",
                          backgroundColor: "var(--brand-bg)",
                          color: "var(--brand-text)",
                        }}
                      />

                      <button
                        type="submit"
                        className="rounded-lg px-3 py-1.5 text-sm font-bold text-white"
                        style={{
                          backgroundColor: "var(--brand-ink)",
                        }}
                      >
                        {t.admin.extend}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-center"
            style={{ color: "var(--brand-text-muted)" }}
          >
            t.admin.notEnrolled
          </p>
        )}
      </div>
    </div>
  );
}
