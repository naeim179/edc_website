import jwt from "jsonwebtoken";
import { playbackResponse, readLessonPlayback } from "@/lib/lesson-playback-access";

const TOKEN_SECONDS = 20 * 60;

export async function POST(request: Request) {
  try {
    const { lesson, error } = await readLessonPlayback(request, "mux");
    if (error) return error;
    if (!lesson.mux_playback_id) return playbackResponse({ error: "Lesson unavailable" }, 403);

    const keyId = process.env.MUX_SIGNING_KEY_ID;
    const privateKey = process.env.MUX_SIGNING_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!keyId || !privateKey) return playbackResponse({ error: "Video playback unavailable" }, 503);

    const token = jwt.sign({ sub: lesson.mux_playback_id, aud: "v" }, privateKey, {
      algorithm: "RS256",
      keyid: keyId,
      expiresIn: TOKEN_SECONDS,
    });
    return playbackResponse({ token, expiresInSeconds: TOKEN_SECONDS });
  } catch {
    console.error("MUX_TOKEN_ERROR");
    return playbackResponse({ error: "Video playback unavailable" }, 500);
  }
}
