"use client";

import { useEffect } from "react";

type ToastType =
  | "success"
  | "error"
  | "info";

type Props = {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
};

export default function ActionToast({
  message,
  type = "success",
  onClose,
}: Props) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(
      onClose,
      3500
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  const styles =
    type === "success"
      ? "border-emerald-500/40 bg-emerald-600 text-white"
      : type === "error"
        ? "border-red-500/40 bg-red-600 text-white"
        : "border-sky-500/40 bg-sky-600 text-white";

  const icon =
    type === "success"
      ? "✓"
      : type === "error"
        ? "!"
        : "i";

  return (
    <div
      className="fixed end-5 top-5 z-[200] w-[min(92vw,420px)] animate-[fadeIn_.18s_ease-out]"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl ${styles}`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black">
          {icon}
        </div>

        <p className="flex-1 pt-1 text-sm font-bold leading-6">
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xl leading-none text-white/80 transition hover:bg-white/15 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
}
