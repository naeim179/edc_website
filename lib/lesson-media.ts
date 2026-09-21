export type LessonMedia =
  | { type: "youtube"; embedUrl: string }
  | { type: "vimeo"; embedUrl: string }
  | { type: "video"; src: string }
  | { type: "link"; href: string }
  | { type: "none" };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIDEO_FILE = /\.(mp4|webm|ogg|mov|m4v)$/i;

/**
 * يحوّل رابط محتوى الدرس لنوع عرض مناسب.
 * - يقبل http/https فقط (يمنع javascript: وغيرها)
 * - يدعم يوتيوب (watch / youtu.be / embed / shorts / live) وفيميو وملفات الفيديو المباشرة
 */
export function getLessonMedia(
  rawUrl: string | null | undefined
): LessonMedia {
  const value = rawUrl?.trim();

  if (!value) {
    return { type: "none" };
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return { type: "none" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { type: "none" };
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");

  // ---- YouTube ----
  let youtubeId: string | null = null;

  if (host === "youtu.be") {
    youtubeId = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      youtubeId = url.searchParams.get("v");
    } else {
      const match = url.pathname.match(
        /^\/(?:embed|shorts|live|v)\/([^/?#]+)/
      );

      youtubeId = match?.[1] ?? null;
    }
  }

  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
    };
  }

  // ---- Vimeo ----
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = url.pathname.match(
      /^\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/
    );

    if (match) {
      const hash = match[2] ? `?h=${match[2]}` : "";

      return {
        type: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${match[1]}${hash}`,
      };
    }
  }

  // ---- ملف فيديو مباشر ----
  if (VIDEO_FILE.test(url.pathname)) {
    return { type: "video", src: url.toString() };
  }

  return { type: "link", href: url.toString() };
}
