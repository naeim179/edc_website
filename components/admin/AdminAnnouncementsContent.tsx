"use client";

import {
  FormEvent,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementActive,
} from "@/app/actions/announcements";

import {
  useLanguage,
} from "@/components/LanguageProvider";

type Announcement = {
  id: string;
  title: string;
  message: string;
  audience:
    | "student"
    | "teacher";
  is_active: boolean;
  created_at: string;
};

export default function AdminAnnouncementsContent({
  announcements,
}: {
  announcements:
    Announcement[];
}) {
  const {
    language,
    t,
  } = useLanguage();

  const isArabic =
    language === "ar";

  const copy =
    t.announcements;

  const router =
    useRouter();

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const [
    audience,
    setAudience,
  ] =
    useState<
      "student" |
      "teacher"
    >("student");

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    confirmDeleteId,
    setConfirmDeleteId,
  ] =
    useState<
      string | null
    >(null);

  function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    formData.set(
      "audience",
      audience
    );

    setError("");
    setSuccess("");

    startTransition(
      async () => {
        try {
          await createAnnouncement(
            formData
          );

          setSuccess(
            copy.publishedSuccess
          );

          formRef.current?.reset();

          setAudience(
            "student"
          );

          router.refresh();
        } catch {
          setError(
            copy.createError
          );
        }
      }
    );
  }

  function toggle(
    id: string,
    current: boolean
  ) {
    setError("");
    setSuccess("");

    startTransition(
      async () => {
        try {
          await setAnnouncementActive(
            id,
            !current
          );

          router.refresh();
        } catch {
          setError(
            copy.updateError
          );
        }
      }
    );
  }

  function remove(
    id: string
  ) {
    setError("");
    setSuccess("");

    startTransition(
      async () => {
        try {
          await deleteAnnouncement(
            id
          );

          setConfirmDeleteId(
            null
          );

          router.refresh();
        } catch {
          setError(
            copy.deleteError
          );
        }
      }
    );
  }

  return (
    <div
      dir={
        isArabic
          ? "rtl"
          : "ltr"
      }
      className="mx-auto w-full max-w-6xl space-y-7"
    >
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-6 text-white shadow-[0_20px_55px_rgba(27,75,67,0.16)] sm:p-8">
        <div className="absolute -start-16 -top-24 h-56 w-56 rounded-full bg-white/[0.05]" />

        <div className="relative">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
            {
              copy.centerBadge
            }
          </span>

          <h1 className="mt-4 text-3xl font-bold">
            {
              copy.title
            }
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-white/70">
            {
              copy.subtitle
            }
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#E1E8E4] bg-white p-5 shadow-[0_14px_40px_rgba(27,75,67,0.05)] sm:p-7">
        <div className="mb-6">
          <p className="text-xs font-bold text-[#A06A45]">
            {
              copy.newAnnouncement
            }
          </p>

          <h2 className="mt-1 text-xl font-bold text-[#24332E]">
            {
              copy.whatToAnnounce
            }
          </h2>
        </div>

        <form
          ref={
            formRef
          }
          onSubmit={
            submit
          }
          className="space-y-5"
        >
          <div>
            <p className="mb-3 text-sm font-bold text-[#24332E]">
              {
                copy.audience
              }
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setAudience(
                    "student"
                  )
                }
                className={`rounded-2xl border p-4 text-start transition ${
                  audience ===
                  "student"
                    ? "border-[#1B4B43] bg-[#EEF5F2] ring-2 ring-[#1B4B43]/10"
                    : "border-[#E1E8E4] bg-[#FAFCFB] hover:border-[#B9CEC5]"
                }`}
              >
                <span className="text-xl">
                  🎓
                </span>

                <span className="mt-2 block font-bold text-[#24332E]">
                  {
                    copy.students
                  }
                </span>

                <span className="mt-1 block text-sm text-[#7B8882]">
                  {
                    copy.studentHint
                  }
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setAudience(
                    "teacher"
                  )
                }
                className={`rounded-2xl border p-4 text-start transition ${
                  audience ===
                  "teacher"
                    ? "border-[#1B4B43] bg-[#EEF5F2] ring-2 ring-[#1B4B43]/10"
                    : "border-[#E1E8E4] bg-[#FAFCFB] hover:border-[#B9CEC5]"
                }`}
              >
                <span className="text-xl">
                  👨‍🏫
                </span>

                <span className="mt-2 block font-bold text-[#24332E]">
                  {
                    copy.teachers
                  }
                </span>

                <span className="mt-1 block text-sm text-[#7B8882]">
                  {
                    copy.teacherHint
                  }
                </span>
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#24332E]">
              {
                copy.titleLabel
              }
            </span>

            <input
              name="title"
              required
              maxLength={
                120
              }
              placeholder={
                copy.titlePlaceholder
              }
              className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none transition focus:border-[#1B4B43] focus:ring-4 focus:ring-[#1B4B43]/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#24332E]">
              {
                copy.messageLabel
              }
            </span>

            <textarea
              name="message"
              required
              maxLength={
                1500
              }
              rows={
                5
              }
              placeholder={
                copy.messagePlaceholder
              }
              className="w-full resize-y rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 leading-7 text-[#24332E] outline-none transition focus:border-[#1B4B43] focus:ring-4 focus:ring-[#1B4B43]/10"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                pending
              }
              className="w-full rounded-2xl bg-[#C9704A] px-7 py-3.5 font-bold text-white shadow-[0_10px_25px_rgba(201,112,74,0.18)] transition hover:bg-[#B96240] disabled:opacity-50 sm:w-auto"
            >
              {pending
                ? copy.publishing
                : copy.publish}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[#A06A45]">
              {
                copy.history
              }
            </p>

            <h2 className="mt-1 text-xl font-bold text-[var(--brand-text)]">
              {
                copy.current
              }
            </h2>
          </div>

          <span className="rounded-full bg-[var(--brand-surface)] px-4 py-2 text-sm font-bold text-[var(--brand-text-muted)]">
            {
              announcements.length
            }{" "}
            {announcements.length ===
            1
              ? copy.announcement
              : copy.announcements}
          </span>
        </div>

        {announcements.length ===
        0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] p-10 text-center text-[var(--brand-text-muted)]">
            {
              copy.empty
            }
          </div>
        ) : (
          <div className="grid gap-4">
            {announcements.map(
              (
                announcement
              ) => (
                <article
                  key={
                    announcement.id
                  }
                  className="rounded-[24px] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            announcement.audience ===
                            "student"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {announcement.audience ===
                          "student"
                            ? `🎓 ${copy.studentBadge}`
                            : `👨‍🏫 ${copy.teacherBadge}`}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            announcement.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {announcement.is_active
                            ? `● ${copy.active}`
                            : copy.paused}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-[var(--brand-text)]">
                        {
                          announcement.title
                        }
                      </h3>

                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--brand-text-muted)]">
                        {
                          announcement.message
                        }
                      </p>

                      <p className="mt-3 text-xs text-[var(--brand-text-faint)]">
                        {new Date(
                          announcement.created_at
                        ).toLocaleString(
                          isArabic
                            ? "ar-JO"
                            : "en-US"
                        )}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={
                          pending
                        }
                        onClick={() =>
                          toggle(
                            announcement.id,
                            announcement.is_active
                          )
                        }
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                          announcement.is_active
                            ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {announcement.is_active
                          ? copy.pause
                          : copy.activate}
                      </button>

                      <button
                        type="button"
                        disabled={
                          pending
                        }
                        onClick={() =>
                          setConfirmDeleteId(
                            announcement.id
                          )
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                      >
                        {
                          copy.delete
                        }
                      </button>
                    </div>
                  </div>

                  {confirmDeleteId ===
                    announcement.id && (
                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-red-700">
                        {
                          copy.deleteConfirm
                        }
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={
                            pending
                          }
                          onClick={() =>
                            remove(
                              announcement.id
                            )
                          }
                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          {
                            copy.confirmDelete
                          }
                        </button>

                        <button
                          type="button"
                          disabled={
                            pending
                          }
                          onClick={() =>
                            setConfirmDeleteId(
                              null
                            )
                          }
                          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700"
                        >
                          {
                            copy.cancel
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
