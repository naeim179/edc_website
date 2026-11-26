import { playbackResponse, readLessonPlayback } from "@/lib/lesson-playback-access";

const EMBED_SECONDS = 10 * 60;

export async function POST(request: Request) {
  try {
    const { lesson, error } = await readLessonPlayback(request, "bunny");
    if (error) return error;

    const library = lesson.bunny_library_id;
    const video = lesson.bunny_video_id;
    if (!/^\d+$/.test(library ?? "") || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(video ?? "")) {
      return playbackResponse({ error: "Lesson unavailable" }, 403);
    }
    const key = process.env.BUNNY_TOKEN_AUTH_KEY?.trim();
    if (!key || library !== process.env.BUNNY_LIBRARY_ID) {
      return playbackResponse({ error: "Video playback unavailable" }, 503);
    }

    const expires = Math.floor(Date.now() / 1000) + EMBED_SECONDS;
    const signature = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${key}${video}${expires}`));
    const token = Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
    const url = new URL(`https://player.mediadelivery.net/embed/${library}/${video}`);
    url.searchParams.set("token", token);
    url.searchParams.set("expires", String(expires));
    return playbackResponse({ url: url.toString() });
  } catch {
    console.error("BUNNY_PLAYBACK_ERROR");
    return playbackResponse({ error: "Video playback unavailable" }, 500);
  }
}
