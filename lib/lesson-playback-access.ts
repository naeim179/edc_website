import { createClient } from "@/lib/supabase/server";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function playbackResponse(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function readLessonPlayback(request: Request, provider: "mux" | "bunny") {
  const body = await request.json().catch(() => null);
  const lessonId = typeof body?.lessonId === "string" ? body.lessonId.trim() : "";
  if (!UUID.test(lessonId)) return { error: playbackResponse({ error: "A valid lessonId is required" }, 400) };

  const supabase = await createClient();
  const { data: lesson, error: lookupError } = await supabase
    .from("lessons")
    .select("section_id,is_free_preview,mux_playback_id,bunny_library_id,bunny_video_id")
    .eq("id", lessonId)
    .eq("video_provider", provider)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (lesson) {
    const { data: allowed, error } = await supabase.rpc("can_read_lesson", {
      p_section_id: lesson.section_id,
      p_is_free_preview: Boolean(lesson.is_free_preview),
    });
    if (error) throw new Error(error.message);
    if (allowed === true) return { lesson };
  }
  return { error: playbackResponse({ error: "Lesson unavailable" }, 403) };
}
