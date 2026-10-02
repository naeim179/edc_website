"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  deleteStudentAccount,
  setStudentBlocked,
} from "@/app/actions/admin-student-account";

import { useLanguage } from "@/components/LanguageProvider";
import ActionToast from "@/components/ui/ActionToast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Props = {
  studentId: string;
  isBanned: boolean;
  bannedUntil: string | null;
  canDeleteStudent: boolean;
};

type ToastState = {
  message: string;
  type:
    | "success"
    | "error"
    | "info";
} | null;

export default function StudentAccountActions({
  studentId,
  isBanned,
  bannedUntil,
  canDeleteStudent,
}: Props) {
  const router =
    useRouter();

  const { language } =
    useLanguage();

  const isArabic =
    language === "ar";

  const [
    accountDialog,
    setAccountDialog,
  ] =
    useState(false);

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

  async function handleBlockChange() {
    try {
      setBusy(true);

      await setStudentBlocked(
        studentId,
        !isBanned
      );

      setAccountDialog(
        false
      );

      setToast({
        type: "success",

        message:
          isBanned
            ? isArabic
              ? "تم فك حظر الحساب بنجاح."
              : "Account unblocked successfully."
            : isArabic
              ? "تم حظر الحساب وإيقاف التجديد التلقائي بنجاح."
              : "Account blocked and automatic renewal disabled successfully.",
      });

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

  async function handleDelete() {
    if (
      deleteConfirmation !==
      "DELETE"
    ) {
      setToast({
        type: "error",
        message:
          isArabic
            ? "اكتب DELETE بشكل صحيح أولاً."
            : "Type DELETE correctly first.",
      });

      return;
    }

    try {
      setBusy(true);

      const formData =
        new FormData();

      formData.set(
        "confirmation",
        deleteConfirmation
      );

      await deleteStudentAccount(
        studentId,
        formData
      );

      setDeleteDialog(
        false
      );

      setToast({
        type: "success",

        message:
          isArabic
            ? "تم حذف الحساب نهائياً."
            : "Account permanently deleted.",
      });

      window.setTimeout(
        () => {
          router.push(
            "/admin/students"
          );

          router.refresh();
        },
        600
      );
    } catch (error) {
      setToast({
        type: "error",

        message:
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر حذف الحساب."
              : "Unable to delete account.",
      });

      setBusy(false);
    }
  }

  return (
    <>
      <section
        className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border bg-[var(--brand-surface)]"
        dir={
          isArabic
            ? "rtl"
            : "ltr"
        }
      >
        <div className="border-b p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                {isArabic
                  ? "إدارة الحساب"
                  : "Account management"}
              </h2>

              <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                {isArabic
                  ? "التحكم بحالة حساب الطالب والوصول إلى المنصة."
                  : "Control the student's account and platform access."}
              </p>
            </div>

            <span
              className={
                isBanned
                  ? "rounded-full border border-red-400/60 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-400"
                  : "rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-400"
              }
            >
              {isBanned
                ? isArabic
                  ? "الحساب محظور"
                  : "Account blocked"
                : isArabic
                  ? "الحساب فعال"
                  : "Account active"}
            </span>
          </div>

          {isBanned &&
            bannedUntil && (
              <p className="mt-3 text-sm font-semibold text-red-400">
                {isArabic
                  ? "الحظر حتى:"
                  : "Blocked until:"}{" "}
                {formatDate(
                  bannedUntil
                )}
              </p>
            )}
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border p-5">
            <div>
              <h3 className="font-bold">
                {isBanned
                  ? isArabic
                    ? "فك حظر الحساب"
                    : "Unblock account"
                  : isArabic
                    ? "حظر الحساب"
                    : "Block account"}
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--brand-text-muted)]">
                {isBanned
                  ? isArabic
                    ? "سيتم السماح للطالب بتسجيل الدخول إلى حسابه من جديد."
                    : "The student will be allowed to sign in again."
                  : isArabic
                    ? "سيتم منع الطالب من تسجيل الدخول، كما سيتم إيقاف التجديد التلقائي للاشتراكات."
                    : "The student will be prevented from signing in and automatic subscription renewal will be disabled."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAccountDialog(
                  true
                )
              }
              className={
                isBanned
                  ? "rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                  : "rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600"
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

          {canDeleteStudent && (
            <div className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
              <h3 className="font-bold text-red-500">
                {isArabic
                  ? "منطقة خطرة"
                  : "Danger zone"}
              </h3>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--brand-text-muted)]">
                {isArabic
                  ? "حذف الحساب نهائي وغير قابل للتراجع. استخدم هذا الخيار فقط عندما تريد إزالة الحساب بالكامل."
                  : "Account deletion is permanent and cannot be undone. Use this only when the account must be removed completely."}
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
                className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                {isArabic
                  ? "حذف الحساب نهائياً"
                  : "Delete account permanently"}
              </button>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={
          accountDialog
        }
        title={
          isBanned
            ? isArabic
              ? "فك حظر الحساب؟"
              : "Unblock account?"
            : isArabic
              ? "حظر الحساب؟"
              : "Block account?"
        }
        description={
          isBanned
            ? isArabic
              ? "سيستطيع الطالب تسجيل الدخول والوصول إلى حسابه من جديد."
              : "The student will be able to sign in and access the account again."
            : isArabic
              ? "سيتم منع الطالب من تسجيل الدخول وإيقاف التجديد التلقائي لاشتراكاته."
              : "The student will be prevented from signing in and automatic renewal will be disabled."
        }
        confirmText={
          isBanned
            ? isArabic
              ? "نعم، فك الحظر"
              : "Yes, unblock"
            : isArabic
              ? "نعم، حظر الحساب"
              : "Yes, block account"
        }
        cancelText={
          isArabic
            ? "إلغاء"
            : "Cancel"
        }
        tone="warning"
        busy={busy}
        onCancel={() =>
          setAccountDialog(
            false
          )
        }
        onConfirm={
          handleBlockChange
        }
      />

      <ConfirmDialog
        open={
          deleteDialog
        }
        title={
          isArabic
            ? "حذف الحساب نهائياً؟"
            : "Permanently delete account?"
        }
        description={
          isArabic
            ? "هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الحساب والبيانات المرتبطة به حسب علاقات قاعدة البيانات."
            : "This action cannot be undone. The account and related data will be deleted according to the database relationships."
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
        busy={busy}
        onCancel={() => {
          if (!busy) {
            setDeleteDialog(
              false
            );
          }
        }}
        onConfirm={
          handleDelete
        }
      >
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-red-500">
            {isArabic
              ? "اكتب DELETE للتأكيد"
              : "Type DELETE to confirm"}
          </span>

          <input
            type="text"
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
            disabled={busy}
            autoComplete="off"
            placeholder="DELETE"
            className="w-full rounded-xl border border-red-500/40 bg-transparent px-4 py-3 font-mono outline-none transition focus:border-red-500"
            dir="ltr"
          />
        </label>
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
          setToast(null)
        }
      />
    </>
  );
}
