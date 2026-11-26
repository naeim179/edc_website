type Grant = { token: string; expiresInSeconds: number };

const RENEW_EARLY_MS = 2 * 60_000;
const RETRY_MS = 20_000;

export async function fetchMuxPlaybackGrant(lessonId: string, signal: AbortSignal): Promise<Grant | null> {
  const response = await fetch("/api/mux/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId }),
    signal,
  });
  if ([401, 403, 404].includes(response.status)) return null;
  if (!response.ok) throw new Error("Playback request failed");

  const grant = await response.json();
  if (typeof grant?.token !== "string" || !grant.token
      || !Number.isFinite(grant.expiresInSeconds) || grant.expiresInSeconds <= 0) {
    throw new Error("Invalid playback grant");
  }
  return grant;
}

export function createMuxPlaybackSession({
  load, isPlaying, accept, unavailable,
}: {
  load: (signal: AbortSignal) => Promise<Grant | null>;
  isPlaying: () => boolean;
  accept: (token: string) => void;
  unavailable: () => void;
}) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight = false;
  let expiresAt = 0;
  let refreshAt = 0;

  function stop() {
    clearTimeout(timer);
    controller.abort();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isPlaying()) void refreshIfNeeded();
    }, Math.max(0, refreshAt - Date.now()));
  }

  async function refreshIfNeeded() {
    const requestedAt = Date.now();
    if (controller.signal.aborted || inFlight || requestedAt < refreshAt) return;
    inFlight = true;
    try {
      const grant = await load(controller.signal);
      if (controller.signal.aborted) return;
      if (!grant) {
        stop();
        unavailable();
        return;
      }

      const lifetime = grant.expiresInSeconds * 1000;
      const nextExpiry = requestedAt + lifetime;
      if (nextExpiry <= Date.now()) throw new Error("Playback grant expired in transit");
      expiresAt = nextExpiry;
      refreshAt = expiresAt - Math.min(RENEW_EARLY_MS, lifetime / 2);
      accept(grant.token);
      schedule();
    } catch {
      // Keep playing on the current grant after a temporary outage, but a
      // denial or an expired grant never falls back to unrestricted playback.
      if (controller.signal.aborted) return;
      if (Date.now() >= expiresAt) {
        stop();
        unavailable();
      } else {
        refreshAt = Math.min(expiresAt, Date.now() + RETRY_MS);
        schedule();
      }
    } finally {
      inFlight = false;
    }
  }

  void refreshIfNeeded();
  return { refreshIfNeeded, stop };
}
