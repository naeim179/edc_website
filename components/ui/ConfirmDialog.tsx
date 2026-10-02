"use client";

import type {
  ReactNode,
} from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  busy?: boolean;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  busy = false,
  tone = "danger",
  onConfirm,
  onCancel,
  children,
}: Props) {
  if (!open) {
    return null;
  }

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-amber-500 hover:bg-amber-600";

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => {
          if (!busy) {
            onCancel();
          }
        }}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border bg-[var(--brand-surface)] shadow-2xl">
        <div className="p-6">
          <div
            className={
              tone === "danger"
                ? "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-500"
                : "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl text-amber-500"
            }
          >
            !
          </div>

          <h3 className="text-xl font-black text-[var(--brand-text)]">
            {title}
          </h3>

          <p className="mt-3 text-sm leading-7 text-[var(--brand-text-muted)]">
            {description}
          </p>

          {children && (
            <div className="mt-5">
              {children}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t p-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border px-5 py-2.5 text-sm font-bold transition hover:bg-black/5 disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmClass}`}
          >
            {busy
              ? "..."
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
