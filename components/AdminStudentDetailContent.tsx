"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import ActionToast from "@/components/ui/ActionToast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

import {
  extendStudentSubscription,
  removeStudentEnrollment,
  resetStudentProgress,
} from "@/app/actions/admin-students";

import { useLanguage } from "@/components/LanguageProvider";

type Subscription = {
  expiresAt: string | null;
  status: string;
  startsAt: string;
  durationMonths: number;
  autoRenew: boolean;
  amount: number | string;
  currency: string;
};

type Enrollment = {
  id: string;
  courseId: string;
  courseTitle: string | null;
  isFree: boolean;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  subscription:
    | Subscription
    | null;
};

type Props = {
  student: {
    id: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    createdAt: string;
  };

  enrollments: Enrollment[];
};

const QUICK_DAYS = [
  7,
  15,
  30,
];

type AccessState =
  | "free"
  | "active"
  | "expired"
  | "cancelled"
  | "none";

export default function AdminStudentDetailContent({
  student,
  enrollments,
}: Props) {
  const { language } =
    useLanguage();

  const router =
    useRouter();

  const isArabic =
    language === "ar";

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [
    confirmAction,
    setConfirmAction,
  ] = useState<{
    type: "reset" | "remove";
    enrollment: Enrollment;
  } | null>(null);

  async function runConfirmedAction() {
    if (!confirmAction) {
      return;
    }

    try {
      setBusy(true);

      if (
        confirmAction.type ===
        "reset"
      ) {
        await resetStudentProgress(
          student.id,
          confirmAction.enrollment.id
        );

        setToast({
          type: "success",
          message:
            isArabic
              ? "تم إعادة ضبط تقدم الطالب بنجاح."
              : "Student progress reset successfully.",
        });
      } else {
        await removeStudentEnrollment(
          student.id,
          confirmAction.enrollment.id
        );

        setToast({
          type: "success",
          message:
            isArabic
              ? "تمت إزالة الطالب من الدورة بنجاح."
              : "Student removed from the course successfully.",
        });
      }

      setConfirmAction(null);
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : isArabic
              ? "حدث خطأ أثناء تنفيذ العملية."
              : "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runExtend(
    formData: FormData
  ) {
    try {
      setBusy(true);

      await extendStudentSubscription(
        formData
      );

      setToast({
        type: "success",
        message:
          isArabic
            ? "تم تمديد الاشتراك بنجاح."
            : "Subscription extended successfully.",
      });

      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر تمديد الاشتراك."
              : "Unable to extend subscription.",
      });
    } finally {
      setBusy(false);
    }
  }

  const text = {
    back: isArabic
      ? "العودة إلى الطلاب"
      : "Back to students",

    noName: isArabic
      ? "بدون اسم"
      : "No name",

    studentInfo: isArabic
      ? "بيانات الطالب"
      : "Student information",

    email: isArabic
      ? "البريد الإلكتروني"
      : "Email",

    phone: isArabic
      ? "رقم الهاتف"
      : "Phone",

    registered: isArabic
      ? "تاريخ التسجيل"
      : "Registered",

    courses: isArabic
      ? "الدورات المسجل بها"
      : "Enrolled courses",

    totalCourses: isArabic
      ? "إجمالي الدورات"
      : "Total courses",

    activeCourses: isArabic
      ? "الدورات النشطة"
      : "Active courses",

    completedLessons: isArabic
      ? "الدروس المكتملة"
      : "Completed lessons",

    progress: isArabic
      ? "التقدم"
      : "Progress",

    free: isArabic
      ? "مجانية"
      : "Free",

    active: isArabic
      ? "نشط"
      : "Active",

    expired: isArabic
      ? "منتهي"
      : "Expired",

    cancelled: isArabic
      ? "ملغي"
      : "Cancelled",

    noSubscription: isArabic
      ? "بدون اشتراك"
      : "No subscription",

    enrolledAt: isArabic
      ? "تاريخ التسجيل بالدورة"
      : "Enrollment date",

    subscriptionStart: isArabic
      ? "بداية الاشتراك"
      : "Subscription start",

    subscriptionEnd: isArabic
      ? "نهاية الاشتراك"
      : "Subscription end",

    duration: isArabic
      ? "مدة الاشتراك"
      : "Subscription duration",

    month: isArabic
      ? "شهر"
      : "month",

    months: isArabic
      ? "أشهر"
      : "months",

    paidAmount: isArabic
      ? "قيمة الاشتراك"
      : "Subscription amount",

    autoRenew: isArabic
      ? "التجديد التلقائي"
      : "Auto renewal",

    enabled: isArabic
      ? "مفعل"
      : "Enabled",

    disabled: isArabic
      ? "غير مفعل"
      : "Disabled",

    legacyUnlimited: isArabic
      ? "وصول قديم بدون تاريخ انتهاء"
      : "Legacy access with no expiry",

    daysLeft: isArabic
      ? "يوم متبقٍ"
      : "days left",

    resetProgress: isArabic
      ? "إعادة ضبط التقدم"
      : "Reset progress",

    removeEnrollment: isArabic
      ? "إزالة من الدورة"
      : "Remove enrollment",

    extend: isArabic
      ? "تمديد الاشتراك"
      : "Extend subscription",

    days: isArabic
      ? "أيام"
      : "days",

    customDays: isArabic
      ? "عدد الأيام"
      : "Days",

    noCourses: isArabic
      ? "هذا الطالب غير مسجل بأي دورة."
      : "This student is not enrolled in any course.",

    unavailableCourse: isArabic
      ? "دورة غير متاحة"
      : "Unavailable course",
  };

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    return new Date(
      value
    ).toLocaleDateString(
      isArabic
        ? "ar-JO"
        : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  function getAccessState(
    enrollment: Enrollment
  ): AccessState {
    if (enrollment.isFree) {
      return "free";
    }

    const subscription =
      enrollment.subscription;

    if (!subscription) {
      return "none";
    }

    if (
      subscription.status ===
      "cancelled"
    ) {
      return "cancelled";
    }

    if (
      subscription.status !==
      "active"
    ) {
      return "expired";
    }

    if (
      subscription.expiresAt &&
      new Date(
        subscription.expiresAt
      ).getTime() <=
        Date.now()
    ) {
      return "expired";
    }

    return "active";
  }

  function accessLabel(
    state: AccessState
  ) {
    switch (state) {
      case "free":
        return text.free;

      case "active":
        return text.active;

      case "expired":
        return text.expired;

      case "cancelled":
        return text.cancelled;

      default:
        return text.noSubscription;
    }
  }

  function accessClass(
    state: AccessState
  ) {
    switch (state) {
      case "free":
      case "active":
        return "border-emerald-400/60 bg-emerald-500/10 text-emerald-300";

      case "expired":
        return "border-amber-400/60 bg-amber-500/10 text-amber-300";

      case "cancelled":
        return "border-red-400/60 bg-red-500/10 text-red-300";

      default:
        return "border-slate-400/50 bg-slate-500/10 text-slate-300";
    }
  }

  function formatExpiry(
    subscription: Subscription
  ) {
    if (
      subscription.status ===
      "cancelled"
    ) {
      return text.cancelled;
    }

    if (
      !subscription.expiresAt
    ) {
      if (
        subscription.status ===
        "active"
      ) {
        return text.legacyUnlimited;
      }

      return "—";
    }

    const expiry =
      new Date(
        subscription.expiresAt
      );

    const diff =
      expiry.getTime() -
      Date.now();

    if (
      subscription.status ===
        "active" &&
      diff > 0
    ) {
      const days =
        Math.ceil(
          diff /
            (
              1000 *
              60 *
              60 *
              24
            )
        );

      return `${formatDate(
        subscription.expiresAt
      )} (${days} ${
        text.daysLeft
      })`;
    }

    return formatDate(
      subscription.expiresAt
    );
  }

  const totalCompleted =
    enrollments.reduce(
      (
        total,
        enrollment
      ) =>
        total +
        enrollment.completedLessons,
      0
    );

  const totalLessons =
    enrollments.reduce(
      (
        total,
        enrollment
      ) =>
        total +
        enrollment.totalLessons,
      0
    );

  const activeCourses =
    enrollments.filter(
      (enrollment) => {
        const state =
          getAccessState(
            enrollment
          );

        return (
          state ===
            "active" ||
          state === "free"
        );
      }
    ).length;

  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6"
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
    >
      <section className="rounded-2xl border bg-[var(--brand-surface)] p-6">
        <Link
          href="/admin/students"
          className="inline-flex text-sm font-bold text-emerald-400 transition hover:opacity-80"
        >
          {isArabic
            ? "→ "
            : "← "}
          {text.back}
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-[var(--brand-text)]">
              {student.fullName ??
                text.noName}
            </h1>

            <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
              {text.registered}:{" "}
              {formatDate(
                student.createdAt
              )}
            </p>
          </div>

          <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">
            {isArabic
              ? "طالب"
              : "Student"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
          <p className="text-sm text-[var(--brand-text-muted)]">
            {text.totalCourses}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {enrollments.length}
          </p>
        </div>

        <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
          <p className="text-sm text-[var(--brand-text-muted)]">
            {text.activeCourses}
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {activeCourses}
          </p>
        </div>

        <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
          <p className="text-sm text-[var(--brand-text-muted)]">
            {text.completedLessons}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalCompleted}
          </p>
        </div>

        <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
          <p className="text-sm text-[var(--brand-text-muted)]">
            {text.progress}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {totalLessons > 0
              ? Math.round(
                  (
                    totalCompleted /
                    totalLessons
                  ) * 100
                )
              : 0}
            %
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-[var(--brand-surface)] p-6">
        <h2 className="mb-5 text-xl font-bold">
          {text.studentInfo}
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <p className="text-xs text-[var(--brand-text-muted)]">
              {text.email}
            </p>

            <p
              className="mt-2 break-all font-semibold"
              dir="ltr"
            >
              {student.email ??
                "—"}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-xs text-[var(--brand-text-muted)]">
              {text.phone}
            </p>

            <p
              className="mt-2 font-semibold"
              dir="ltr"
            >
              {student.phone ??
                "—"}
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-xs text-[var(--brand-text-muted)]">
              {text.registered}
            </p>

            <p className="mt-2 font-semibold">
              {formatDate(
                student.createdAt
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-[var(--brand-surface)] p-6">
        <h2 className="mb-5 text-xl font-bold">
          {text.courses}
        </h2>

        {enrollments.length ===
        0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-[var(--brand-text-muted)]">
            {text.noCourses}
          </div>
        ) : (
          <div className="space-y-5">
            {enrollments.map(
              (enrollment) => {
                const state =
                  getAccessState(
                    enrollment
                  );

                const percentage =
                  enrollment.totalLessons >
                  0
                    ? Math.min(
                        100,
                        Math.round(
                          (
                            enrollment.completedLessons /
                            enrollment.totalLessons
                          ) * 100
                        )
                      )
                    : 0;

                return (
                  <article
                    key={
                      enrollment.id
                    }
                    className="overflow-hidden rounded-2xl border"
                  >
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold">
                              {enrollment.courseTitle ??
                                text.unavailableCourse}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${accessClass(
                                state
                              )}`}
                            >
                              {accessLabel(
                                state
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                            {
                              text.enrolledAt
                            }
                            :{" "}
                            {formatDate(
                              enrollment.enrolledAt
                            )}
                          </p>
                        </div>

                        <div className="text-sm font-bold">
                          {
                            enrollment.completedLessons
                          }
                          /
                          {
                            enrollment.totalLessons
                          }{" "}
                          —{" "}
                          {
                            percentage
                          }
                          %
                        </div>
                      </div>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/10">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      {!enrollment.isFree &&
                        enrollment.subscription && (
                          <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs text-[var(--brand-text-muted)]">
                                {
                                  text.subscriptionStart
                                }
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {formatDate(
                                  enrollment
                                    .subscription
                                    .startsAt
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-[var(--brand-text-muted)]">
                                {
                                  text.subscriptionEnd
                                }
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {formatExpiry(
                                  enrollment.subscription
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-[var(--brand-text-muted)]">
                                {
                                  text.duration
                                }
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {
                                  enrollment
                                    .subscription
                                    .durationMonths
                                }{" "}
                                {enrollment
                                  .subscription
                                  .durationMonths ===
                                1
                                  ? text.month
                                  : text.months}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-[var(--brand-text-muted)]">
                                {
                                  text.paidAmount
                                }
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {
                                  enrollment
                                    .subscription
                                    .amount
                                }{" "}
                                {
                                  enrollment
                                    .subscription
                                    .currency
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-[var(--brand-text-muted)]">
                                {
                                  text.autoRenew
                                }
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {enrollment
                                  .subscription
                                  .autoRenew
                                  ? text.enabled
                                  : text.disabled}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t p-4">
                      <button
                        type="button"
                        disabled={
                          busy ||
                          enrollment.completedLessons ===
                            0
                        }
                        onClick={() =>
                          setConfirmAction({
                            type: "reset",
                            enrollment,
                          })
                        }
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {
                          text.resetProgress
                        }
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setConfirmAction({
                            type: "remove",
                            enrollment,
                          })
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {
                          text.removeEnrollment
                        }
                      </button>
                    </div>

                    {!enrollment.isFree &&
                      enrollment.subscription && (
                        <div className="border-t p-4">
                          <p className="mb-3 text-sm font-bold">
                            {
                              text.extend
                            }
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            {QUICK_DAYS.map(
                              (
                                days
                              ) => (
                                <form
                                  key={
                                    days
                                  }
                                  onSubmit={async (
                                    event
                                  ) => {
                                    event.preventDefault();

                                    await runExtend(
                                      new FormData(
                                        event.currentTarget
                                      )
                                    );
                                  }}
                                >
                                  <input
                                    type="hidden"
                                    name="studentId"
                                    value={
                                      student.id
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="courseId"
                                    value={
                                      enrollment.courseId
                                    }
                                  />

                                  <input
                                    type="hidden"
                                    name="days"
                                    value={
                                      days
                                    }
                                  />

                                  <button
                                    type="submit"
                                    disabled={busy}
                                    className="rounded-lg border px-3 py-2 text-sm font-bold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    +
                                    {
                                      days
                                    }{" "}
                                    {
                                      text.days
                                    }
                                  </button>
                                </form>
                              )
                            )}

                            <form
                              onSubmit={async (
                                event
                              ) => {
                                event.preventDefault();

                                await runExtend(
                                  new FormData(
                                    event.currentTarget
                                  )
                                );
                              }}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input
                                type="hidden"
                                name="studentId"
                                value={
                                  student.id
                                }
                              />

                              <input
                                type="hidden"
                                name="courseId"
                                value={
                                  enrollment.courseId
                                }
                              />

                              <input
                                type="number"
                                name="days"
                                min={1}
                                max={3650}
                                required
                                placeholder={
                                  text.customDays
                                }
                                className="w-32 rounded-lg border bg-transparent px-3 py-2 text-sm"
                              />

                              <button
                                type="submit"
                                disabled={busy}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {
                                  text.extend
                                }
                              </button>
                            </form>
                          </div>
                        </div>
                      )}
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={
          confirmAction !==
          null
        }
        title={
          confirmAction?.type ===
          "reset"
            ? isArabic
              ? "إعادة ضبط التقدم؟"
              : "Reset progress?"
            : isArabic
              ? "إزالة الطالب من الدورة؟"
              : "Remove student from course?"
        }
        description={
          confirmAction?.type ===
          "reset"
            ? isArabic
              ? "سيتم حذف تقدم الطالب في جميع دروس هذه الدورة وإعادته إلى 0%."
              : "The student's lesson progress for this course will be reset to 0%."
            : confirmAction?.enrollment
                  .isFree
              ? isArabic
                ? "سيتم إزالة تسجيل الطالب من هذه الدورة."
                : "The student's enrollment in this course will be removed."
              : isArabic
                ? "سيتم إلغاء الاشتراك، إيقاف التجديد التلقائي، ثم إزالة الطالب من الدورة."
                : "The subscription will be cancelled, automatic renewal stopped, and the student removed from the course."
        }
        confirmText={
          confirmAction?.type ===
          "reset"
            ? isArabic
              ? "نعم، إعادة الضبط"
              : "Yes, reset"
            : isArabic
              ? "نعم، إزالة"
              : "Yes, remove"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone={
          confirmAction?.type ===
          "remove"
            ? "danger"
            : "warning"
        }
        busy={busy}
        onCancel={() =>
          setConfirmAction(
            null
          )
        }
        onConfirm={
          runConfirmedAction
        }
      />

      <ActionToast
        message={
          toast?.message ??
          null
        }
        type={
          toast?.type
        }
        onClose={() =>
          setToast(null)
        }
      />
    </div>
  );
}
