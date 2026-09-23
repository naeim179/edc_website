import { NextRequest, NextResponse } from "next/server";
import { canManageCourse } from "@/lib/auth/can-manage-course";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      courseId?: string;
    };

    const courseId = body.courseId?.trim();

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    const allowed = await canManageCourse(courseId);

    if (!allowed) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const libraryId = process.env.BUNNY_LIBRARY_ID;
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      return NextResponse.json(
        { error: "Bunny is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Lesson ${Date.now()}`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "BUNNY_CREATE_VIDEO_ERROR",
        data
      );

      return NextResponse.json(
        {
          error: "Failed to create Bunny video",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      videoId: data.guid,
      libraryId,
    });
  } catch (error) {
    console.error(
      "BUNNY_UPLOAD_ERROR",
      error
    );

    return NextResponse.json(
      {
        error: "Bunny upload preparation failed",
      },
      { status: 500 }
    );
  }
}
