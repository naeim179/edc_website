import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageCourse } from "@/lib/auth/can-manage-course";
import {
  UUID,
  MAX_VIDEO_BYTES,
  VIDEO_UPLOAD_TIMEOUT_MS,
  VideoUploadError,
  boundedVideoStream,
  validateVideoFile,
  type UploadProvider,
  type UploadState,
  type VideoUpload,
} from "@/lib/video-upload-policy";

const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: noStore });
function fail(error: unknown) {
  if (error instanceof VideoUploadError)
    return json({ code: error.code, error: error.code }, error.status);
  console.error("VIDEO_UPLOAD_OPERATION_FAILED");
  return json(
    { code: "UPLOAD_SERVICE_ERROR", error: "UPLOAD_SERVICE_ERROR" },
    500,
  );
}
async function input(request: Request) {
  if (!request.body) throw new VideoUploadError("INVALID_UPLOAD_METADATA");
  const reader = request.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) throw new VideoUploadError("INVALID_UPLOAD_METADATA");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  try {
    const parsed = JSON.parse(
      chunks.map((c) => new TextDecoder().decode(c)).join(""),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new VideoUploadError("INVALID_UPLOAD_METADATA");
    return parsed as Record<string, unknown>;
  } catch {
    throw new VideoUploadError("INVALID_UPLOAD_METADATA");
  }
}
async function authorize(courseId: string) {
  if (!courseId || !(await canManageCourse(courseId)))
    throw new VideoUploadError("UPLOAD_UNAUTHORIZED", 403);
  if (!UUID.test(courseId))
    throw new VideoUploadError("INVALID_UPLOAD_METADATA");
}
function providerHeaders(provider: UploadProvider): Record<string, string> {
  if (provider === "bunny") {
    if (!process.env.BUNNY_API_KEY || !process.env.BUNNY_LIBRARY_ID)
      throw new VideoUploadError("UPLOAD_NOT_CONFIGURED", 503);
    return {
      AccessKey: process.env.BUNNY_API_KEY,
      "Content-Type": "application/json",
    };
  }
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET)
    throw new VideoUploadError("UPLOAD_NOT_CONFIGURED", 503);
  return {
    Authorization: `Basic ${btoa(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`)}`,
    "Content-Type": "application/json",
  };
}
async function api(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new VideoUploadError("UPLOAD_PROVIDER_ERROR", 502);
  return response.json();
}
function validMuxUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      (u.hostname === "storage.googleapis.com" ||
        u.hostname.endsWith(".storage.googleapis.com") ||
        u.hostname === "upload.mux.com" ||
        u.hostname.endsWith(".mux.com"))
    );
  } catch {
    return false;
  }
}
async function lookup(id: string, courseId: string) {
  if (!UUID.test(id)) throw new VideoUploadError("UPLOAD_NOT_FOUND", 404);
  const { data, error } = await createAdminClient()
    .from("lesson_video_uploads")
    .select("*")
    .eq("id", id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error("Upload lookup unavailable");
  if (!data) throw new VideoUploadError("UPLOAD_NOT_FOUND", 404);
  return data as VideoUpload;
}
async function writeState(
  row: VideoUpload,
  state: UploadState,
  extra: Record<string, unknown> = {},
) {
  const { data, error } = await createAdminClient()
    .from("lesson_video_uploads")
    .update({ ...extra, state, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("state", row.state)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Could not save upload state");
  if (!data) throw new VideoUploadError("UPLOAD_NOT_AVAILABLE", 409);
}
export async function prepareVideoUpload(
  request: Request,
  provider: UploadProvider,
) {
  let row: VideoUpload | undefined;
  let createdTarget:
    | { id: string; headers: Record<string, string>; libraryId?: string }
    | undefined;
  try {
    const body = await input(request);
    const courseId =
      typeof body.courseId === "string" ? body.courseId.trim() : "";
    await authorize(courseId);
    validateVideoFile(body.size, body.type);
    const headers = providerHeaders(provider);
    const client = await createClient();
    const { data: id, error } = await client.rpc(
      "reserve_lesson_video_upload",
      {
        p_course_id: courseId,
        p_provider: provider,
        p_bytes: body.size as number,
        p_mime: body.type as string,
      },
    );
    if (error) {
      const code = [
        "UPLOAD_DAILY_LIMIT",
        "UPLOAD_ACTIVE_LIMIT",
        "UPLOAD_COURSE_LIMIT",
      ].find((c) => error.message.includes(c));
      if (code) throw new VideoUploadError(code, 429);
      throw new Error("Upload reservation failed");
    }
    if (typeof id !== "string") throw new Error("Invalid reservation");
    row = await lookup(id, courseId);
    if (provider === "bunny") {
      const libraryId = process.env.BUNNY_LIBRARY_ID!;
      const data = await api(
        `https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ title: `Lesson ${id}` }),
        },
      );
      if (typeof data.guid !== "string" || !UUID.test(data.guid))
        throw new VideoUploadError("UPLOAD_PROVIDER_ERROR", 502);
      createdTarget = { id: data.guid, headers, libraryId };
      await writeState(row, "reserved", {
        provider_upload_id: data.guid,
        provider_asset_id: data.guid,
        library_id: libraryId,
      });
    } else {
      const data = await api("https://api.mux.com/video/v1/uploads", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cors_origin: new URL(request.url).origin,
          timeout: 3600,
          new_asset_settings: {
            playback_policies: ["signed"],
            video_quality: "basic",
            passthrough: courseId,
          },
        }),
      });
      if (typeof data.data?.id === "string")
        createdTarget = { id: data.data.id, headers };
      if (typeof data.data?.id !== "string" || !validMuxUrl(data.data?.url))
        throw new VideoUploadError("UPLOAD_PROVIDER_ERROR", 502);
      await writeState(row, "reserved", {
        provider_upload_id: data.data.id,
        upload_url: data.data.url,
      });
    }
    return json({
      uploadId: id,
      uploadUrl: `/api/video-uploads/${id}?courseId=${encodeURIComponent(courseId)}`,
      maxBytes: MAX_VIDEO_BYTES,
    });
  } catch (error) {
    // This target was just created and never issued to a client. Compensate a
    // failed registry write so a database outage does not leave a known orphan.
    if (createdTarget) {
      try {
        const target = createdTarget;
        const endpoint =
          provider === "bunny"
            ? `https://video.bunnycdn.com/library/${encodeURIComponent(target.libraryId!)}/videos/${encodeURIComponent(target.id)}`
            : `https://api.mux.com/video/v1/uploads/${encodeURIComponent(target.id)}/cancel`;
        const response = await fetch(endpoint, {
          method: provider === "bunny" ? "DELETE" : "PUT",
          headers: target.headers,
          signal: AbortSignal.timeout(30_000),
          redirect: "error",
        });
        if (!response.ok && response.status !== 404)
          console.error("VIDEO_UPLOAD_COMPENSATION_FAILED");
      } catch {
        console.error("VIDEO_UPLOAD_COMPENSATION_FAILED");
      }
    }
    if (row)
      await writeState(row, "failed", {
        error_code: "PREPARATION_FAILED",
      }).catch(() => {});
    return fail(error);
  }
}
export async function sendVideoUpload(
  request: Request,
  id: string,
  courseId: string,
) {
  let row: VideoUpload | undefined;
  let streamFailure: unknown;
  let transferSignal: AbortSignal | undefined;
  let verifiedComplete = false;
  const upstreamController = new AbortController();
  try {
    await authorize(courseId);
    row = await lookup(id, courseId);
    if (!request.body) throw new VideoUploadError("UPLOAD_EMPTY");
    const length = request.headers.get("content-length");
    if (
      length !== null &&
      (!/^\d+$/.test(length) || Number(length) !== row.expected_bytes)
    )
      throw new VideoUploadError("UPLOAD_SIZE_MISMATCH");
    if (request.headers.get("content-type")?.split(";")[0] !== row.mime_type)
      throw new VideoUploadError("UPLOAD_NOT_VIDEO");
    const headers = providerHeaders(row.provider);
    const { data, error } = await createAdminClient().rpc(
      "claim_lesson_video_upload",
      { p_id: id, p_course_id: courseId },
    );
    if (error || !data) throw new VideoUploadError("UPLOAD_NOT_AVAILABLE", 409);
    row = data as VideoUpload;
    const url =
      row.provider === "bunny"
        ? `https://video.bunnycdn.com/library/${encodeURIComponent(row.library_id!)}/videos/${encodeURIComponent(row.provider_upload_id!)}`
        : row.upload_url;
    if (!url || (row.provider === "mux" && !validMuxUrl(url)))
      throw new VideoUploadError("UPLOAD_PROVIDER_ERROR", 502);
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(VIDEO_UPLOAD_TIMEOUT_MS),
      upstreamController.signal,
    ]);
    transferSignal = signal;
    const stream = boundedVideoStream(
      request.body,
      row.expected_bytes,
      signal,
      (error) => {
        streamFailure = error;
      },
      () => {
        verifiedComplete = true;
      },
    );
    const options: RequestInit & { duplex: "half" } = {
      method: "PUT",
      headers:
        row.provider === "bunny"
          ? { ...headers, "Content-Type": row.mime_type }
          : { "Content-Type": row.mime_type },
      body: stream,
      duplex: "half",
      signal,
      redirect: "error",
    };
    const response = await fetch(url, options);
    if (!response.ok) throw new VideoUploadError("UPLOAD_PROVIDER_ERROR", 502);
    if (!verifiedComplete) throw new VideoUploadError("UPLOAD_SIZE_MISMATCH");
    await writeState(row, "processing", {
      upload_url: null,
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
    });
    return json({ uploadId: id, ready: false });
  } catch (error) {
    const failure =
      streamFailure ??
      (transferSignal?.aborted
        ? new VideoUploadError(
            transferSignal.reason?.name === "TimeoutError"
              ? "UPLOAD_TIMEOUT"
              : "UPLOAD_CANCELLED",
            409,
          )
        : error);
    upstreamController.abort(error);
    if (row?.state === "uploading")
      await writeState(row, "failed", { error_code: "TRANSFER_FAILED" }).catch(
        () => {},
      );
    return fail(failure);
  }
}
function playback(row: VideoUpload) {
  return {
    ready: row.state === "ready",
    state: row.state,
    provider: row.provider,
    assetId: row.provider_asset_id,
    playbackId: row.provider_playback_id,
    videoId: row.provider === "bunny" ? row.provider_asset_id : null,
    libraryId: row.library_id,
  };
}
export async function videoUploadStatus(id: string, courseId: string) {
  try {
    await authorize(courseId);
    const row = await lookup(id, courseId);
    if (["cancelled", "deleting", "deleted", "failed"].includes(row.state))
      throw new VideoUploadError(
        row.state === "failed" ? "UPLOAD_FAILED" : "UPLOAD_CANCELLED",
        409,
      );
    if (row.state !== "processing") return json(playback(row));
    if (Date.parse(row.expires_at) <= Date.now())
      throw new VideoUploadError("UPLOAD_EXPIRED", 409);
    if (Date.now() - Date.parse(row.updated_at) < 2000)
      return json({ ready: false, state: "processing" });
    const headers = providerHeaders(row.provider);
    let assetId = row.provider_asset_id;
    let playbackId = row.provider_playback_id;
    let ready = false;
    let failed = false;
    if (row.provider === "bunny") {
      const data = await api(
        `https://video.bunnycdn.com/library/${encodeURIComponent(row.library_id!)}/videos/${encodeURIComponent(row.provider_upload_id!)}`,
        { headers },
      );
      ready = data.status === 4;
      failed = data.status === 5 || data.status === 6;
    } else {
      const { data: upload } = await api(
        `https://api.mux.com/video/v1/uploads/${encodeURIComponent(row.provider_upload_id!)}`,
        { headers },
      );
      if (upload?.new_asset_settings?.passthrough !== courseId)
        throw new VideoUploadError("UPLOAD_UNAUTHORIZED", 403);
      failed = ["errored", "cancelled", "timed_out"].includes(upload.status);
      if (
        upload.status === "asset_created" &&
        typeof upload.asset_id === "string"
      ) {
        const { data: asset } = await api(
          `https://api.mux.com/video/v1/assets/${encodeURIComponent(upload.asset_id)}`,
          { headers },
        );
        if (typeof asset?.id !== "string" || asset.id !== upload.asset_id)
          throw new VideoUploadError("UPLOAD_PROVIDER_ERROR", 502);
        assetId = asset.id;
        playbackId =
          asset.playback_ids?.find(
            (p: { policy: string }) => p.policy === "signed",
          )?.id ?? null;
        ready = asset.status === "ready" && Boolean(playbackId);
        failed = asset.status === "errored";
      }
    }
    await writeState(row, failed ? "failed" : ready ? "ready" : "processing", {
      provider_asset_id: assetId,
      provider_playback_id: playbackId,
      error_code: failed ? "PROCESSING_FAILED" : null,
    });
    if (failed) throw new VideoUploadError("UPLOAD_FAILED", 409);
    return json(
      playback({
        ...row,
        state: ready ? "ready" : "processing",
        provider_asset_id: assetId,
        provider_playback_id: playbackId,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}
export async function cancelVideoUpload(id: string, courseId: string) {
  try {
    await authorize(courseId);
    await lookup(id, courseId);
    const { error } = await createAdminClient().rpc(
      "cancel_lesson_video_upload",
      { p_id: id, p_course_id: courseId },
    );
    if (error) throw new VideoUploadError("UPLOAD_ALREADY_LINKED", 409);
    // The client aborts the stream immediately. Keep remote provenance and quota
    // until stale, unlinked cleanup; do not race DELETE against an active PUT.
    return json({ cancelled: true });
  } catch (error) {
    return fail(error);
  }
}

export async function cleanupStaleVideoUpload(id: string) {
  const admin = createAdminClient();
  const { data: initial, error } = await admin
    .from("lesson_video_uploads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !initial) throw new Error("UPLOAD_NOT_FOUND");
  let row = initial as VideoUpload;
  let muxUploadStatus: string | undefined;
  if (
    Date.parse(row.created_at) > Date.now() - 86400_000 ||
    Date.parse(row.expires_at) > Date.now() ||
    row.state === "deleted"
  )
    throw new Error("UPLOAD_NOT_STALE");
  const headers = row.provider_upload_id
    ? providerHeaders(row.provider)
    : undefined;
  // Discover a Mux asset before the database claim so the link check and trigger
  // protect its actual asset ID, including an upload abandoned during processing.
  if (row.provider === "mux" && row.provider_upload_id) {
    const response = await fetch(
      `https://api.mux.com/video/v1/uploads/${encodeURIComponent(row.provider_upload_id)}`,
      { headers, signal: AbortSignal.timeout(30_000), cache: "no-store" },
    );
    if (response.status !== 404) {
      if (!response.ok) throw new Error("UPLOAD_PROVIDER_ERROR");
      const { data } = await response.json();
      muxUploadStatus = data?.status;
      if (data.asset_id && data.asset_id !== row.provider_asset_id) {
        const { error: save } = await admin
          .from("lesson_video_uploads")
          .update({ provider_asset_id: data.asset_id })
          .eq("id", id);
        if (save) throw new Error("UPLOAD_SERVICE_ERROR");
      }
    } else muxUploadStatus = "missing";
  }
  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_stale_video_upload",
    { p_id: id },
  );
  if (claimError || !claimed) throw new Error("UPLOAD_NOT_STALE_OR_LINKED");
  row = claimed as VideoUpload;
  try {
    const remove = async (url: string, method = "DELETE") => {
      const r = await fetch(url, {
        method,
        headers,
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
        redirect: "error",
      });
      if (!r.ok && r.status !== 404) throw new Error("UPLOAD_PROVIDER_ERROR");
    };
    if (row.provider_upload_id) {
      if (row.provider === "bunny")
        await remove(
          `https://video.bunnycdn.com/library/${encodeURIComponent(row.library_id!)}/videos/${encodeURIComponent(row.provider_upload_id)}`,
        );
      else if (row.provider_asset_id)
        await remove(
          `https://api.mux.com/video/v1/assets/${encodeURIComponent(row.provider_asset_id)}`,
        );
      else if (muxUploadStatus === "waiting")
        await remove(
          `https://api.mux.com/video/v1/uploads/${encodeURIComponent(row.provider_upload_id)}/cancel`,
          "PUT",
        );
      else if (
        !["timed_out", "cancelled", "errored", "missing"].includes(
          muxUploadStatus ?? "",
        )
      )
        throw new Error("UPLOAD_PROVIDER_ERROR");
    }
    await writeState(row, "deleted", { upload_url: null, error_code: null });
  } catch (error) {
    await writeState(row, "failed", { error_code: "CLEANUP_FAILED" }).catch(
      () => {},
    );
    throw error;
  }
}
