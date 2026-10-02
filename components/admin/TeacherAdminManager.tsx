"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import ImageUploader from "@/components/ui/ImageUploader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ActionToast from "@/components/ui/ActionToast";

import {
  useLanguage,
} from "@/components/LanguageProvider";

import {
  assignCourseToTeacher,
  deleteTeacherAccount,
  removeCourseFromTeacher,
  setTeacherBlocked,
  updateTeacherAccount,
} from "@/app/actions/teachers";

import {
  deleteTeacherAvatar,
  updateTeacherProfile,
} from "@/app/actions/teacher-profile";

type Tab =
  | "profile"
  | "account"
  | "courses"
  | "security";

type Props = {
  teacher: {
    id: string;
    fullName:
      | string
      | null;
    email: string;
    phone:
      | string
      | null;
    createdAt: string;
    lastSignInAt:
      | string
      | null;
  };

  profile: {
    imageUrl:
      | string
      | null;
    specialization:
      | string
      | null;
    experienceYears:
      | number
      | null;
    bio:
      | string
      | null;
  };

  assignments: {
    id: string;
    courseId: string;
    title: string;
    courseType:
      | "group"
      | "private";
    isPublished: boolean;
    studentsCount: number;
  }[];

  availableCourses: {
    id: string;
    title: string;
    courseType:
      | "group"
      | "private";
    isPublished: boolean;
  }[];

  stats: {
    courses: number;
    students: number;
    conversations: number;
  };

  isBanned: boolean;

  bannedUntil:
    | string
    | null;

  canDeleteTeacher: boolean;

  canManageCourses: boolean;
};

type ToastState = {
  message: string;
  type:
    | "success"
    | "error";
} | null;

export default function TeacherAdminManager({
  teacher,
  profile,
  assignments,
  availableCourses,
  stats,
  isBanned,
  bannedUntil,
  canDeleteTeacher,
  canManageCourses,
}: Props) {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "profile"
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    toast,
    setToast,
  ] =
    useState<ToastState>(
      null
    );

  const [
    imageUrl,
    setImageUrl,
  ] =
    useState<
      string | null
    >(
      profile.imageUrl
    );

  const [
    avatarDialog,
    setAvatarDialog,
  ] =
    useState(false);

  const [
    blockDialog,
    setBlockDialog,
  ] =
    useState(false);

  const [
    removeAssignment,
    setRemoveAssignment,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleteDialog,
    setDeleteDialog,
  ] =
    useState(false);

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] =
    useState("");

  useEffect(() => {
    setImageUrl(
      profile.imageUrl
    );
  }, [
    profile.imageUrl,
  ]);

  function formatDate(
    value:
      | string
      | null
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

  function initials() {
    const name =
      teacher.fullName
        ?.trim();

    if (!name) {
      return "T";
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .toUpperCase();
  }

  function showSuccess(
    message: string
  ) {
    setToast({
      type: "success",
      message,
    });
  }

  function showError(
    error: unknown,
    fallback: string
  ) {
    setToast({
      type: "error",

      message:
        error instanceof
        Error
          ? error.message
          : fallback,
    });
  }

  async function handleProfileSave(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setBusy(true);

      const formData =
        new FormData(
          event.currentTarget
        );

      formData.set(
        "image_url",
        imageUrl ?? ""
      );

      await updateTeacherProfile(
        teacher.id,
        formData
      );

      showSuccess(
        isArabic
          ? "تم حفظ ملف المدرس بنجاح."
          : "Teacher profile saved."
      );

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر حفظ ملف المدرس."
          : "Unable to save teacher profile."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAccountSave(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    try {
      setBusy(true);

      await updateTeacherAccount(
        teacher.id,
        new FormData(
          form
        )
      );

      showSuccess(
        isArabic
          ? "تم تحديث معلومات الحساب."
          : "Account information updated."
      );

      const passwordInput =
        form.querySelector<HTMLInputElement>(
          'input[name="password"]'
        );

      if (passwordInput) {
        passwordInput.value = "";
      }

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر تحديث الحساب."
          : "Unable to update account."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignCourse(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form =
      event.currentTarget;

    try {
      setBusy(true);

      await assignCourseToTeacher(
        teacher.id,
        new FormData(
          form
        )
      );

      showSuccess(
        isArabic
          ? "تمت إضافة الدورة للمدرس."
          : "Course assigned to teacher."
      );

      form.reset();

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر إضافة الدورة."
          : "Unable to assign course."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemoveCourse() {
    if (!removeAssignment) {
      return;
    }

    try {
      setBusy(true);

      await removeCourseFromTeacher(
        teacher.id,
        removeAssignment
      );

      setRemoveAssignment(
        null
      );

      showSuccess(
        isArabic
          ? "تمت إزالة المدرس من الدورة."
          : "Teacher removed from course."
      );

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر إزالة الدورة."
          : "Unable to remove course."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmAvatarDelete() {
    try {
      setBusy(true);

      await deleteTeacherAvatar(
        teacher.id
      );

      setImageUrl(
        null
      );

      setAvatarDialog(
        false
      );

      showSuccess(
        isArabic
          ? "تم حذف صورة المدرس."
          : "Teacher image removed."
      );

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر حذف الصورة."
          : "Unable to remove image."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmBlock() {
    try {
      setBusy(true);

      await setTeacherBlocked(
        teacher.id,
        !isBanned
      );

      setBlockDialog(
        false
      );

      showSuccess(
        isBanned
          ? isArabic
            ? "تم فك حظر حساب المدرس."
            : "Teacher account unblocked."
          : isArabic
            ? "تم حظر حساب المدرس."
            : "Teacher account blocked."
      );

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر تغيير حالة الحساب."
          : "Unable to change account status."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteAccount() {
    if (
      deleteConfirmation !==
      "DELETE"
    ) {
      setToast({
        type: "error",

        message:
          isArabic
            ? "اكتب DELETE بشكل صحيح."
            : "Type DELETE correctly.",
      });

      return;
    }

    try {
      setBusy(true);

      await deleteTeacherAccount(
        teacher.id,
        deleteConfirmation
      );

      router.push(
        "/admin/teachers"
      );

      router.refresh();
    } catch (error) {
      showError(
        error,
        isArabic
          ? "تعذر حذف الحساب."
          : "Unable to delete account."
      );

      setBusy(false);
    }
  }

  const tabs: {
    id: Tab;
    label: string;
  }[] = [
    {
      id: "profile",

      label:
        isArabic
          ? "الملف الشخصي"
          : "Profile",
    },
    {
      id: "account",

      label:
        isArabic
          ? "الحساب"
          : "Account",
    },
    {
      id: "courses",

      label:
        isArabic
          ? "الدورات"
          : "Courses",
    },
    {
      id: "security",

      label:
        isArabic
          ? "إدارة الحساب"
          : "Account management",
    },
  ];

  return (
    <>
      <div
        className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <section className="rounded-3xl border bg-[var(--brand-surface)] p-6 shadow-sm">
          <Link
            href="/admin/teachers"
            className="text-sm font-bold text-[#087a54] transition hover:opacity-70"
          >
            {isArabic
              ? "→ العودة إلى المدرسين"
              : "← Back to teachers"}
          </Link>

          <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border bg-[var(--brand-bg)] text-2xl font-black text-[#087a54]">
              {imageUrl ? (
                <img
                  src={
                    imageUrl
                  }
                  alt={
                    teacher.fullName ??
                    ""
                  }
                  className="h-full w-full object-cover"
                />
              ) : (
                initials()
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-[var(--brand-text)] sm:text-3xl">
                  {teacher.fullName ??
                    (
                      isArabic
                        ? "مدرس"
                        : "Teacher"
                    )}
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    isBanned
                      ? "border-red-500/40 bg-red-500/10 text-red-500"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {isBanned
                    ? isArabic
                      ? "محظور"
                      : "Blocked"
                    : isArabic
                      ? "فعال"
                      : "Active"}
                </span>
              </div>

              <p
                className="mt-2 text-sm text-[var(--brand-text-muted)]"
                dir="ltr"
              >
                {
                  teacher.email
                }
              </p>

              {profile.specialization && (
                <p className="mt-1 text-sm font-semibold text-[#087a54]">
                  {
                    profile.specialization
                  }
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--brand-text-muted)]">
                <span>
                  {isArabic
                    ? "تاريخ الإنشاء:"
                    : "Created:"}{" "}
                  {formatDate(
                    teacher.createdAt
                  )}
                </span>

                <span>
                  {isArabic
                    ? "آخر دخول:"
                    : "Last sign in:"}{" "}
                  {formatDate(
                    teacher.lastSignInAt
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
            <p className="text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "الدورات"
                : "Courses"}
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                stats.courses
              }
            </p>
          </div>

          <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
            <p className="text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "الطلاب"
                : "Students"}
            </p>

            <p className="mt-2 text-3xl font-black text-[#087a54]">
              {
                stats.students
              }
            </p>
          </div>

          <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
            <p className="text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "المحادثات"
                : "Conversations"}
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                stats.conversations
              }
            </p>
          </div>

          <div className="rounded-2xl border bg-[var(--brand-surface)] p-5">
            <p className="text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "سنوات الخبرة"
                : "Experience"}
            </p>

            <p className="mt-2 text-3xl font-black">
              {profile.experienceYears ??
                0}
            </p>
          </div>
        </section>

        <div className="overflow-x-auto rounded-2xl border bg-[var(--brand-surface)] p-1">
          <div className="flex min-w-max">
            {tabs.map(
              (
                item
              ) => (
                <button
                  key={
                    item.id
                  }
                  type="button"
                  onClick={() =>
                    setTab(
                      item.id
                    )
                  }
                  className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                    tab ===
                    item.id
                      ? "bg-[#087a54] text-white shadow-sm"
                      : "text-[var(--brand-text-muted)] hover:bg-[var(--brand-bg)] hover:text-[var(--brand-text)]"
                  }`}
                >
                  {
                    item.label
                  }
                </button>
              )
            )}
          </div>
        </div>

        {tab ===
          "profile" && (
          <form
            onSubmit={
              handleProfileSave
            }
            className="rounded-3xl border bg-[var(--brand-surface)] p-6 shadow-sm"
          >
            <div>
              <h2 className="text-xl font-black">
                {isArabic
                  ? "الملف الشخصي للمدرس"
                  : "Teacher profile"}
              </h2>

              <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                {isArabic
                  ? "هذه المعلومات تظهر للطلاب في صفحة الدورة."
                  : "This information is shown to students on course pages."}
              </p>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
              <div>
                <label className="mb-3 block text-sm font-bold">
                  {isArabic
                    ? "صورة المدرس"
                    : "Teacher image"}
                </label>

                <ImageUploader
                  value={
                    imageUrl
                  }
                  onChange={
                    setImageUrl
                  }
                  folder="teachers"
                  deleteOldImage
                />

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setAvatarDialog(
                        true
                      )
                    }
                    className="mt-3 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
                  >
                    {isArabic
                      ? "حذف الصورة"
                      : "Remove image"}
                  </button>
                )}

                <input
                  type="hidden"
                  name="image_url"
                  value={
                    imageUrl ??
                    ""
                  }
                  readOnly
                />
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    {isArabic
                      ? "التخصص"
                      : "Specialization"}
                  </span>

                  <input
                    name="specialization"
                    defaultValue={
                      profile.specialization ??
                      ""
                    }
                    placeholder={
                      isArabic
                        ? "مثال: برمجة، أمن سيبراني..."
                        : "Example: Programming, Cyber Security..."
                    }
                    className="w-full rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    {isArabic
                      ? "سنوات الخبرة"
                      : "Years of experience"}
                  </span>

                  <input
                    name="experience_years"
                    type="number"
                    min={0}
                    max={80}
                    defaultValue={
                      profile.experienceYears ??
                      0
                    }
                    className="w-full rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    {isArabic
                      ? "نبذة عن المدرس"
                      : "Teacher bio"}
                  </span>

                  <textarea
                    name="bio"
                    rows={6}
                    maxLength={
                      3000
                    }
                    defaultValue={
                      profile.bio ??
                      ""
                    }
                    className="w-full resize-y rounded-xl border bg-transparent px-4 py-3 leading-7 outline-none focus:border-[#087a54]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    busy
                  }
                  className="rounded-xl bg-[#087a54] px-6 py-3 font-bold text-white transition hover:bg-[#066846] disabled:opacity-50"
                >
                  {busy
                    ? isArabic
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isArabic
                      ? "حفظ الملف الشخصي"
                      : "Save profile"}
                </button>
              </div>
            </div>
          </form>
        )}

        {tab ===
          "account" && (
          <form
            onSubmit={
              handleAccountSave
            }
            className="rounded-3xl border bg-[var(--brand-surface)] p-6 shadow-sm"
          >
            <h2 className="text-xl font-black">
              {isArabic
                ? "معلومات الحساب"
                : "Account information"}
            </h2>

            <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
              {isArabic
                ? "تعديل بيانات تسجيل دخول المدرس ومعلومات الاتصال."
                : "Manage the teacher's sign-in and contact information."}
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  {isArabic
                    ? "الاسم"
                    : "Name"}
                </span>

                <input
                  name="fullName"
                  required
                  defaultValue={
                    teacher.fullName ??
                    ""
                  }
                  className="w-full rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  {isArabic
                    ? "البريد الإلكتروني"
                    : "Email"}
                </span>

                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={
                    teacher.email
                  }
                  dir="ltr"
                  className="w-full rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  {isArabic
                    ? "رقم الهاتف"
                    : "Phone"}
                </span>

                <input
                  name="phone"
                  defaultValue={
                    teacher.phone ??
                    ""
                  }
                  dir="ltr"
                  className="w-full rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  {isArabic
                    ? "كلمة مرور جديدة"
                    : "New password"}
                </span>

                <input
                  name="password"
                  type="password"
                  minLength={6}
                  placeholder={
                    isArabic
                      ? "اتركها فارغة لعدم التغيير"
                      : "Leave blank to keep current password"
                  }
                  className="w-full rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={
                busy
              }
              className="mt-6 rounded-xl bg-[#087a54] px-6 py-3 font-bold text-white transition hover:bg-[#066846] disabled:opacity-50"
            >
              {busy
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ التعديلات"
                  : "Save changes"}
            </button>
          </form>
        )}

        {tab ===
          "courses" && (
          <div className="space-y-6">
            <section className="rounded-3xl border bg-[var(--brand-surface)] p-6 shadow-sm">
              <h2 className="text-xl font-black">
                {isArabic
                  ? "الدورات المعينة للمدرس"
                  : "Assigned courses"}
              </h2>

              <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                {isArabic
                  ? `${assignments.length} دورة معينة لهذا المدرس`
                  : `${assignments.length} assigned courses`}
              </p>

              {assignments.length ===
              0 ? (
                <div className="mt-6 rounded-2xl border border-dashed p-8 text-center text-[var(--brand-text-muted)]">
                  {isArabic
                    ? "لا توجد دورات معينة لهذا المدرس."
                    : "No courses assigned to this teacher."}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {assignments.map(
                    (
                      assignment
                    ) => (
                      <article
                        key={
                          assignment.id
                        }
                        className="flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black">
                              {
                                assignment.title
                              }
                            </h3>

                            <span className="rounded-full bg-[var(--brand-bg)] px-2.5 py-1 text-xs font-bold">
                              {assignment.courseType ===
                              "group"
                                ? isArabic
                                  ? "جماعية"
                                  : "Group"
                                : isArabic
                                  ? "خاصة"
                                  : "Private"}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                assignment.isPublished
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-amber-500/10 text-amber-600"
                              }`}
                            >
                              {assignment.isPublished
                                ? isArabic
                                  ? "منشورة"
                                  : "Published"
                                : isArabic
                                  ? "مسودة"
                                  : "Draft"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                            {isArabic
                              ? "عدد الطلاب:"
                              : "Students:"}{" "}
                            <strong>
                              {
                                assignment.studentsCount
                              }
                            </strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {canManageCourses && (
                            <Link
                              href={`/admin/courses/${assignment.courseId}/edit`}
                              className="rounded-xl border px-4 py-2 text-sm font-bold transition hover:bg-[var(--brand-bg)]"
                            >
                              {isArabic
                                ? "فتح الدورة"
                                : "Open course"}
                            </Link>
                          )}

                          <button
                            type="button"
                            disabled={
                              busy
                            }
                            onClick={() =>
                              setRemoveAssignment(
                                assignment.id
                              )
                            }
                            className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {isArabic
                              ? "إزالة المدرس"
                              : "Remove teacher"}
                          </button>
                        </div>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>

            <form
              onSubmit={
                handleAssignCourse
              }
              className="rounded-3xl border bg-[var(--brand-surface)] p-6 shadow-sm"
            >
              <h2 className="text-xl font-black">
                {isArabic
                  ? "إضافة دورة للمدرس"
                  : "Assign a course"}
              </h2>

              <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                {isArabic
                  ? "تظهر هنا فقط الدورات غير المعينة لهذا المدرس."
                  : "Only courses not already assigned to this teacher are shown."}
              </p>

              {availableCourses.length >
              0 ? (
                <div className="mt-5 flex flex-col gap-3 md:flex-row">
                  <select
                    name="courseId"
                    required
                    defaultValue=""
                    className="min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-3 outline-none focus:border-[#087a54]"
                  >
                    <option value="">
                      {isArabic
                        ? "اختر الدورة"
                        : "Choose course"}
                    </option>

                    {availableCourses.map(
                      (
                        course
                      ) => (
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
                          }{" "}
                          —{" "}
                          {course.courseType ===
                          "group"
                            ? "Group"
                            : "Private"}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="submit"
                    disabled={
                      busy
                    }
                    className="rounded-xl bg-[#087a54] px-6 py-3 font-bold text-white transition hover:bg-[#066846] disabled:opacity-50"
                  >
                    {isArabic
                      ? "إضافة الدورة"
                      : "Assign course"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed p-5 text-sm text-[var(--brand-text-muted)]">
                  {isArabic
                    ? "لا توجد دورات أخرى متاحة للإضافة."
                    : "No additional courses are available."}
                </div>
              )}
            </form>
          </div>
        )}

        {tab ===
          "security" && (
          <section className="overflow-hidden rounded-3xl border bg-[var(--brand-surface)] shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-black">
                {isArabic
                  ? "إدارة الحساب"
                  : "Account management"}
              </h2>

              <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                {isArabic
                  ? "التحكم بوصول المدرس إلى المنصة."
                  : "Control the teacher's access to the platform."}
              </p>
            </div>

            <div className="p-6">
              <div className="flex flex-col gap-4 rounded-2xl border p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-black">
                    {isBanned
                      ? isArabic
                        ? "فك حظر الحساب"
                        : "Unblock account"
                      : isArabic
                        ? "حظر حساب المدرس"
                        : "Block teacher account"}
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--brand-text-muted)]">
                    {isBanned
                      ? isArabic
                        ? "سيتمكن المدرس من تسجيل الدخول واستخدام حسابه مرة أخرى."
                        : "The teacher will be able to sign in again."
                      : isArabic
                        ? "سيتم منع المدرس من تسجيل الدخول، لكن الدورات والبيانات ستبقى محفوظة."
                        : "The teacher will be prevented from signing in, while courses and data remain saved."}
                  </p>

                  {isBanned &&
                    bannedUntil && (
                      <p className="mt-2 text-xs font-semibold text-red-500">
                        {isArabic
                          ? "الحظر حتى:"
                          : "Blocked until:"}{" "}
                        {formatDate(
                          bannedUntil
                        )}
                      </p>
                    )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBlockDialog(
                      true
                    )
                  }
                  className={
                    isBanned
                      ? "rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white"
                      : "rounded-xl bg-amber-500 px-5 py-3 font-bold text-white"
                  }
                >
                  {isBanned
                    ? isArabic
                      ? "فك الحظر"
                      : "Unblock"
                    : isArabic
                      ? "حظر الحساب"
                      : "Block account"}
                </button>
              </div>

              {canDeleteTeacher && (
                <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
                  <h3 className="font-black text-red-500">
                    {isArabic
                      ? "منطقة خطرة"
                      : "Danger zone"}
                  </h3>

                  <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--brand-text-muted)]">
                    {isArabic
                      ? "حذف حساب المدرس نهائي وغير قابل للتراجع. العلاقات المرتبطة بالحساب مثل تعيينات الدورات والمحادثات قد تُحذف حسب علاقات قاعدة البيانات."
                      : "Deleting the teacher is permanent. Related course assignments and conversations may also be deleted according to database relationships."}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmation(
                        ""
                      );

                      setDeleteDialog(
                        true
                      );
                    }}
                    className="mt-4 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
                  >
                    {isArabic
                      ? "حذف حساب المدرس نهائياً"
                      : "Delete teacher permanently"}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={
          avatarDialog
        }
        title={
          isArabic
            ? "حذف صورة المدرس؟"
            : "Remove teacher image?"
        }
        description={
          isArabic
            ? "سيتم حذف الصورة الحالية من ملف المدرس."
            : "The current teacher image will be removed."
        }
        confirmText={
          isArabic
            ? "حذف الصورة"
            : "Remove image"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone="danger"
        busy={
          busy
        }
        onCancel={() =>
          setAvatarDialog(
            false
          )
        }
        onConfirm={
          confirmAvatarDelete
        }
      />

      <ConfirmDialog
        open={
          removeAssignment !==
          null
        }
        title={
          isArabic
            ? "إزالة المدرس من الدورة؟"
            : "Remove teacher from course?"
        }
        description={
          isArabic
            ? "لن يتم حذف الدورة، سيتم فقط إزالة تعيين هذا المدرس منها."
            : "The course will not be deleted. Only this teacher assignment will be removed."
        }
        confirmText={
          isArabic
            ? "نعم، إزالة"
            : "Yes, remove"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone="danger"
        busy={
          busy
        }
        onCancel={() =>
          setRemoveAssignment(
            null
          )
        }
        onConfirm={
          confirmRemoveCourse
        }
      />

      <ConfirmDialog
        open={
          blockDialog
        }
        title={
          isBanned
            ? isArabic
              ? "فك حظر المدرس؟"
              : "Unblock teacher?"
            : isArabic
              ? "حظر حساب المدرس؟"
              : "Block teacher account?"
        }
        description={
          isBanned
            ? isArabic
              ? "سيتم السماح للمدرس بتسجيل الدخول مرة أخرى."
              : "The teacher will be allowed to sign in again."
            : isArabic
              ? "سيتم منع المدرس من تسجيل الدخول، بدون حذف دوراته أو بياناته."
              : "The teacher will be prevented from signing in without deleting courses or data."
        }
        confirmText={
          isBanned
            ? isArabic
              ? "فك الحظر"
              : "Unblock"
            : isArabic
              ? "حظر الحساب"
              : "Block account"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone="warning"
        busy={
          busy
        }
        onCancel={() =>
          setBlockDialog(
            false
          )
        }
        onConfirm={
          confirmBlock
        }
      />

      <ConfirmDialog
        open={
          deleteDialog
        }
        title={
          isArabic
            ? "حذف حساب المدرس نهائياً؟"
            : "Permanently delete teacher?"
        }
        description={
          isArabic
            ? "هذا الإجراء غير قابل للتراجع. اكتب DELETE للتأكيد."
            : "This action cannot be undone. Type DELETE to confirm."
        }
        confirmText={
          isArabic
            ? "حذف نهائي"
            : "Delete permanently"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone="danger"
        busy={
          busy
        }
        onCancel={() =>
          setDeleteDialog(
            false
          )
        }
        onConfirm={
          confirmDeleteAccount
        }
      >
        <input
          value={
            deleteConfirmation
          }
          onChange={(
            event
          ) =>
            setDeleteConfirmation(
              event.target.value
            )
          }
          placeholder="DELETE"
          dir="ltr"
          className="w-full rounded-xl border border-red-500/40 bg-transparent px-4 py-3 font-mono outline-none focus:border-red-500"
        />
      </ConfirmDialog>

      <ActionToast
        message={
          toast?.message ??
          null
        }
        type={
          toast?.type
        }
        onClose={() =>
          setToast(
            null
          )
        }
      />
    </>
  );
}
