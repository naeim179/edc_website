import { NextRequest, NextResponse } from "next/server";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      videoId: string;
    }>;
  }
) {
  try {
    const { videoId } = await params;
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(videoId)) {
      return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
    }

    const courseId =
      request.headers.get("x-course-id");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    const allowed =
      await canManageCourse(courseId);

    if (!allowed) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const libraryId =
      process.env.BUNNY_LIBRARY_ID;

    const apiKey =
      process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json(
        {
          error:
            "Bunny is not configured",
        },
        { status: 500 }
      );
    }

    const { data: ownership, error: ownershipError } = await createAdminClient()
      .from("bunny_video_uploads")
      .select("video_id")
      .eq("video_id", videoId)
      .eq("course_id", courseId)
      .eq("library_id", libraryId)
      .maybeSingle();
    if (ownershipError) throw new Error("Could not verify Bunny video ownership");
    if (!ownership) {
      return NextResponse.json({ error: "Unauthorized video" }, { status: 403 });
    }

    const bunnyResponse =
      await fetch(
        `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`,
        {
          method: "PUT",
          headers: {
            AccessKey: apiKey,
            "Content-Type":
              request.headers.get(
                "content-type"
              ) ?? "application/octet-stream",
          },
          body: request.body,
          cache: "no-store",
          duplex: "half",
        } as unknown as RequestInit
      );

    if (!bunnyResponse.ok) {
      const errorText =
        await bunnyResponse.text();

      console.error(
        "BUNNY_UPLOAD_ERROR",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "Failed uploading video to Bunny",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      success: true,
      videoId,
    });
  } catch (error) {
    console.error(
      "BUNNY_UPLOAD_ROUTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Upload failed",
      },
      {
        status: 500,
      }
    );
  }
}
