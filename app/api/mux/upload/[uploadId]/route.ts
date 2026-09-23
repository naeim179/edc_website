import { NextRequest, NextResponse } from "next/server";
import { canManageCourse } from "@/lib/auth/can-manage-course";

function getMuxAuthorization() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    return null;
  }

  return `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      uploadId: string;
    }>;
  }
) {
  try {
    const { uploadId } = await params;

    const courseId =
      request.nextUrl.searchParams.get("courseId")?.trim();

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

    const authorization = getMuxAuthorization();

    if (!authorization) {
      return NextResponse.json(
        { error: "Mux is not configured" },
        { status: 500 }
      );
    }

    /*
     * 1) Check the Direct Upload.
     */
    const uploadResponse = await fetch(
      `https://api.mux.com/video/v1/uploads/${encodeURIComponent(
        uploadId
      )}`,
      {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const uploadJson = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error(
        "MUX_UPLOAD_STATUS_ERROR",
        JSON.stringify(uploadJson)
      );

      return NextResponse.json(
        {
          error: "تعذر التحقق من حالة رفع الفيديو",
        },
        { status: 502 }
      );
    }

    const upload = uploadJson.data as {
      id: string;
      status:
        | "waiting"
        | "asset_created"
        | "errored"
        | "cancelled"
        | "timed_out";
      asset_id?: string;
      error?: {
        type?: string;
        message?: string;
      };
      new_asset_settings?: {
        passthrough?: string | null;
      };
    };

    /*
     * تأكد أن الـUpload تابع لنفس الدورة.
     */
    if (
      upload.new_asset_settings?.passthrough &&
      upload.new_asset_settings.passthrough !== courseId
    ) {
      return NextResponse.json(
        { error: "Unauthorized upload" },
        { status: 403 }
      );
    }

    if (
      upload.status === "errored" ||
      upload.status === "cancelled" ||
      upload.status === "timed_out"
    ) {
      return NextResponse.json({
        uploadStatus: upload.status,
        assetId: upload.asset_id ?? null,
        playbackId: null,
        assetStatus: null,
        ready: false,
        error:
          upload.error?.message ??
          "فشل رفع أو معالجة الفيديو",
      });
    }

    /*
     * ما زال الملف يترفع أو Mux لم ينشئ Asset بعد.
     */
    if (
      upload.status !== "asset_created" ||
      !upload.asset_id
    ) {
      return NextResponse.json({
        uploadStatus: upload.status,
        assetId: null,
        playbackId: null,
        assetStatus: null,
        ready: false,
      });
    }

    /*
     * 2) Asset created.
     * Get its playback ID and processing status.
     */
    const assetResponse = await fetch(
      `https://api.mux.com/video/v1/assets/${encodeURIComponent(
        upload.asset_id
      )}`,
      {
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const assetJson = await assetResponse.json();

    if (!assetResponse.ok) {
      console.error(
        "MUX_ASSET_STATUS_ERROR",
        JSON.stringify(assetJson)
      );

      return NextResponse.json(
        {
          error: "تعذر التحقق من معالجة الفيديو",
        },
        { status: 502 }
      );
    }

    const asset = assetJson.data as {
      id: string;
      status?: string;
      playback_ids?: Array<{
        id: string;
        policy: "public" | "signed" | "drm";
      }>;
      errors?: {
        messages?: string[];
      };
    };

    const signedPlayback =
      asset.playback_ids?.find(
        (item) => item.policy === "signed"
      ) ?? null;

    return NextResponse.json({
      uploadStatus: upload.status,
      assetId: asset.id,
      playbackId: signedPlayback?.id ?? null,
      assetStatus: asset.status ?? null,
      ready:
        asset.status === "ready" &&
        Boolean(signedPlayback?.id),
      error:
        asset.status === "errored"
          ? asset.errors?.messages?.[0] ??
            "فشلت معالجة الفيديو"
          : null,
    });
  } catch (error) {
    console.error(
      "MUX_UPLOAD_STATUS_ROUTE_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "حدث خطأ أثناء التحقق من حالة الفيديو",
      },
      { status: 500 }
    );
  }
}
