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
  createAssignment,
  deleteAssignment,
} from "@/app/actions/assignments";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import {
  formatAssignmentDate,
} from "@/lib/format-assignment-date";


type Course = {
  id: string;
  title: string;
};


type Assignment = {
  id: string;
  course_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  max_score: number;
  allow_late: boolean;
  max_attempts: number;
  is_published: boolean;
  created_at: string;
};


export default function AssignmentsManager({
  courses,
  assignments,
  mode,
}: {
  courses: Course[];
  assignments:
    Assignment[];
  mode:
    | "admin"
    | "teacher";
}) {
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

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

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


  function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const data =
      new FormData(
        event.currentTarget
      );

    const localDue =
      String(
        data.get(
          "due_local"
        ) ?? ""
      ).trim();

    data.delete(
      "due_local"
    );

    if (localDue) {
      data.set(
        "due_at",
        new Date(
          localDue
        ).toISOString()
      );
    }

    setError("");
    setSuccess("");

    startTransition(
      async () => {
        try {
          await createAssignment(
            data
          );

          formRef.current?.reset();

          setSuccess(
            copy.created
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


  function remove(
    assignmentId:
      string
  ) {
    const confirmed =
      window.confirm(
        copy.deleteConfirm
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    startTransition(
      async () => {
        try {
          await deleteAssignment(
            assignmentId
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


  function courseName(
    courseId:
      string
  ) {
    return (
      courses.find(
        (course) =>
          course.id ===
          courseId
      )?.title ??
      copy.unknownCourse
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
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-l from-[#123F39] via-[#1B4B43] to-[#28665B] p-7 text-white shadow-[0_20px_55px_rgba(27,75,67,0.16)]">
        <div className="absolute -start-16 -top-24 h-56 w-56 rounded-full bg-white/[0.05]" />

        <div className="relative">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
            {mode ===
            "teacher"
              ? copy.teacherCenter
              : copy.adminCenter}
          </span>

          <h1 className="mt-4 text-3xl font-bold">
            {copy.title}
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-white/70">
            {copy.subtitle}
          </p>
        </div>
      </section>


      <section className="rounded-[28px] border border-[#E1E8E4] bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-bold text-[#24332E]">
          {copy.newAssignment}
        </h2>

        {courses.length ===
        0 ? (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
            {copy.noCourses}
          </p>
        ) : (
          <form
            ref={
              formRef
            }
            onSubmit={
              submit
            }
            className="mt-6 space-y-5"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#24332E]">
                {copy.course}
              </span>

              <select
                name="course_id"
                required
                className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none"
              >
                <option value="">
                  {copy.chooseCourse}
                </option>

                {courses.map(
                  (course) => (
                    <option
                      key={
                        course.id
                      }
                      value={
                        course.id
                      }
                    >
                      {
                        course.title
                      }
                    </option>
                  )
                )}
              </select>
            </label>


            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#24332E]">
                {copy.assignmentTitle}
              </span>

              <input
                name="title"
                required
                maxLength={
                  160
                }
                className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none"
                placeholder={
                  copy.titlePlaceholder
                }
              />
            </label>


            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[#24332E]">
                {copy.instructions}
              </span>

              <textarea
                name="instructions"
                rows={
                  5
                }
                maxLength={
                  10000
                }
                className="w-full resize-y rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 leading-7 text-[#24332E] outline-none"
                placeholder={
                  copy.instructionsPlaceholder
                }
              />
            </label>


            <div className="grid gap-4 md:grid-cols-3">
              <label>
                <span className="mb-2 block text-sm font-bold text-[#24332E]">
                  {copy.deadline}
                </span>

                <input
                  type="datetime-local"
                  name="due_local"
                  className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-sm font-bold text-[#24332E]">
                  {copy.maxScore}
                </span>

                <input
                  type="number"
                  name="max_score"
                  min="1"
                  max="10000"
                  step="0.5"
                  defaultValue="100"
                  className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none"
                />
              </label>


              <label>
                <span className="mb-2 block text-sm font-bold text-[#24332E]">
                  {copy.attempts}
                </span>

                <select
                  name="max_attempts"
                  defaultValue="1"
                  className="w-full rounded-2xl border border-[#DCE5E0] bg-[#FCFDFC] px-4 py-3.5 text-[#24332E] outline-none"
                >
                  <option value="1">
                    1
                  </option>

                  <option value="2">
                    2
                  </option>

                  <option value="3">
                    3
                  </option>

                  <option value="0">
                    {copy.unlimited}
                  </option>
                </select>
              </label>
            </div>


            <label className="flex items-center gap-3 rounded-2xl border border-[#E1E8E4] bg-[#FAFCFB] p-4">
              <input
                type="checkbox"
                name="allow_late"
                defaultChecked
                className="h-4 w-4"
              />

              <span>
                <span className="block font-bold text-[#24332E]">
                  {copy.allowLate}
                </span>

                <span className="mt-1 block text-xs text-[#7B8882]">
                  {copy.allowLateHint}
                </span>
              </span>
            </label>


            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {success}
              </div>
            )}


            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  pending
                }
                className="w-full rounded-2xl bg-[#C9704A] px-7 py-3.5 font-bold text-white transition hover:bg-[#B96240] disabled:opacity-50 sm:w-auto"
              >
                {pending
                  ? copy.creating
                  : copy.create}
              </button>
            </div>
          </form>
        )}
      </section>


      <section className="space-y-4">
        <div>
          <p className="text-xs font-bold text-[#A06A45]">
            {copy.library}
          </p>

          <h2 className="mt-1 text-xl font-bold text-[var(--brand-text)]">
            {copy.currentAssignments}
          </h2>
        </div>


        {assignments.length ===
        0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] p-10 text-center text-[var(--brand-text-muted)]">
            {copy.empty}
          </div>
        ) : (
          <div className="grid gap-4">
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
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="rounded-full bg-[#EEF5F2] px-3 py-1 text-xs font-bold text-[#1B4B43]">
                        {courseName(
                          assignment.course_id
                        )}
                      </span>

                      <h3 className="mt-3 text-lg font-bold text-[var(--brand-text)]">
                        {
                          assignment.title
                        }
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--brand-text-muted)]">
                        {
                          assignment.instructions ||
                          copy.noInstructions
                        }
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-700">
                          {
                            assignment.max_score
                          }{" "}
                          {
                            copy.points
                          }
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">
                          {assignment.due_at
                            ? formatAssignmentDate(
                                assignment.due_at,
                                language
                              )
                            : copy.noDeadline}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        pending
                      }
                      onClick={() =>
                        remove(
                          assignment.id
                        )
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100"
                    >
                      {copy.delete}
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
