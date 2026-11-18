import type { SupportAdapter } from "./types";

/** Coalesce event bursts, serialize reads and catch up after reconnect/focus.
 * A disconnected view checks every 5s (thread) / 10s (list). Connected views
 * retain a 30s safety check; hidden/offline views never poll.
 */
export function watchSupportView(
  api: SupportAdapter,
  ticketId: string | undefined,
  refresh: () => Promise<void>,
) {
  let stopped = false;
  let connected = false;
  let running = false;
  let queued = false;
  let scheduled: number | undefined;
  let ticks = 0;
  const visible = () => document.visibilityState === "visible" && navigator.onLine !== false;
  const schedule = () => {
    if (stopped || !visible()) return;
    if (running) { queued = true; return; }
    if (scheduled !== undefined) return;
    scheduled = window.setTimeout(async () => {
      scheduled = undefined;
      if (stopped || !visible()) return;
      running = true;
      try { await refresh(); } catch { /* The view retains its retry/error UI. */ }
      finally {
        running = false;
        if (queued) { queued = false; schedule(); }
      }
    }, 75);
  };
  let unsubscribe: (() => void) | undefined;
  try {
    unsubscribe = api.subscribe?.(ticketId, schedule, ready => {
      connected = ready;
      if (ready) { ticks = 0; schedule(); }
    });
  } catch { connected = false; }
  const interval = ticketId ? 5000 : 10000;
  const timer = window.setInterval(() => {
    ticks += 1;
    if (!connected || ticks % (30000 / interval) === 0) schedule();
  }, interval);
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("online", schedule);
  window.addEventListener("focus", schedule);
  schedule();
  return () => {
    stopped = true;
    queued = false;
    window.clearTimeout(scheduled);
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", schedule);
    window.removeEventListener("online", schedule);
    window.removeEventListener("focus", schedule);
    unsubscribe?.();
  };
}
