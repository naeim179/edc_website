"use client";
import { useEffect, useRef, useId } from "react";

export function useModalFocus(
  open: boolean,
  onCancel: () => void,
  busy = false,
) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const latest = useRef({ onCancel, busy });
  useEffect(() => {
    latest.current = { onCancel, busy };
  }, [onCancel, busy]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
    (focusable()[0] ?? ref.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !latest.current.busy) {
        event.preventDefault();
        latest.current.onCancel();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) {
        event.preventDefault();
        ref.current?.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          !ref.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !ref.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return { ref, id };
}
