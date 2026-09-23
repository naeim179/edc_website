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

    // فقط Admin أو المدرس المسؤول عن الدورة
    // يقدر ينشئ رابط رفع إلى Mux.
    const allowed = await canManageCourse(courseId);

    if (!allowed) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      console.error("Mux credentials are missing");

      return NextResponse.json(
        { error: "Mux is not configured" },
        { status: 500 }
      );
    }

    // Mux يحتاج Origin حتى يسمح للمتصفح
    // بالرفع المباشر إلى الـsigned upload URL.
    const origin =
      request.headers.get("origin") ??
      new URL(request.url).origin;

    const authorization = `Basic ${btoa(
      `${tokenId}:${tokenSecret}`
    )}`;

    const muxResponse = await fetch(
      "https://api.mux.com/video/v1/uploads",
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cors_origin: origin,

          // ساعة واحدة لبدء/إكمال الرفع.
          timeout: 3600,

          new_asset_settings: {
            // الدروس على Mux ستكون محمية.
            playback_policies: ["signed"],

            // مناسب كبداية ويقلل التكلفة.
            video_quality: "basic",

            // يساعدنا لاحقًا بربط الـAsset بالدورة.
            passthrough: courseId,
          },
        }),
        cache: "no-store",
      }
    );

    const muxData = await muxResponse.json();

    if (!muxResponse.ok) {
      console.error(
        "MUX_CREATE_UPLOAD_ERROR",
        JSON.stringify(muxData)
      );

      return NextResponse.json(
        {
          error:
            "تعذر إنشاء رابط رفع الفيديو",
        },
        { status: 502 }
      );
    }

    const upload = muxData.data as {
      id?: string;
      url?: string;
      status?: string;
    };

    if (!upload.id || !upload.url) {
      console.error(
        "MUX_INVALID_UPLOAD_RESPONSE",
        JSON.stringify(muxData)
      );

      return NextResponse.json(
        {
          error:
            "Mux returned an invalid upload response",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
      status: upload.status ?? "waiting",
    });
  } catch (error) {
    console.error("MUX_UPLOAD_ROUTE_ERROR", error);

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء تجهيز رفع الفيديو",
      },
      { status: 500 }
    );
  }
}
