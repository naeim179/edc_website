import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lessonId = typeof body.lessonId === "string" ? body.lessonId.trim() : "";

    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(lessonId)) {
      return NextResponse.json(
        { error: "A valid lessonId is required" },
        { status: 400 }
      );
    }

    // Resolve the playback ID on the server. RLS and the explicit access
    // check cover previews, enrolled students and assigned instructors.
    const supabase = await createClient();
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("section_id,is_free_preview,mux_playback_id,video_provider")
      .eq("id", lessonId)
      .eq("video_provider", "mux")
      .maybeSingle();
    if (lessonError) throw new Error(lessonError.message);
    if (!lesson?.mux_playback_id) {
      return NextResponse.json({ error: "Lesson unavailable" }, { status: 403 });
    }
    const { data: allowed, error: accessError } = await supabase.rpc("can_read_lesson", {
      p_section_id: lesson.section_id,
      p_is_free_preview: Boolean(lesson.is_free_preview),
    });
    if (accessError) throw new Error(accessError.message);
    if (allowed !== true) {
      return NextResponse.json({ error: "Lesson unavailable" }, { status: 403 });
    }

    const keyId = process.env.MUX_SIGNING_KEY_ID;
    const privateKey =
      process.env.MUX_SIGNING_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!keyId || !privateKey) {
      return NextResponse.json(
        { error: "Mux signing keys missing" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        sub: lesson.mux_playback_id,
        aud: "v",
      },
      privateKey.replace(/\\n/g, "\n"),
      {
        algorithm: "RS256",
        keyid: keyId,
        expiresIn: "4h",
      }
    );

    return NextResponse.json({ token }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("MUX_TOKEN_ERROR", error);

    return NextResponse.json(
      {
        error: "Failed to generate token",
      },
      {
        status: 500,
      }
    );
  }
}
