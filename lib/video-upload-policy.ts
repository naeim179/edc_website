// Below the 100 MB request ceiling on the current Cloudflare delivery path.
export const MAX_VIDEO_BYTES = 90 * 1024 * 1024;
export const VIDEO_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;
export const VIDEO_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
export const VIDEO_POLL_INTERVAL_MS = 3000;
export const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type UploadProvider = "bunny" | "mux";
export type UploadState =
  | "reserved"
  | "uploading"
  | "processing"
  | "ready"
  | "failed"
  | "cancelled"
  | "deleting"
  | "deleted";
export type VideoUpload = {
  id: string;
  course_id: string | null;
  created_by: string | null;
  provider: UploadProvider;
  expected_bytes: number;
  mime_type: string;
  state: UploadState;
  provider_upload_id: string | null;
  provider_asset_id: string | null;
  provider_playback_id: string | null;
  library_id: string | null;
  upload_url: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  error_code: string | null;
};
export class VideoUploadError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function validateVideoFile(size: unknown, type: unknown) {
  if (typeof type !== "string" || !/^video\/[a-zA-Z0-9.+_-]{1,80}$/.test(type))
    throw new VideoUploadError("UPLOAD_NOT_VIDEO");
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1)
    throw new VideoUploadError("UPLOAD_EMPTY");
  if (size > MAX_VIDEO_BYTES)
    throw new VideoUploadError("UPLOAD_TOO_LARGE", 413);
}
// Stream with backpressure. Never buffer the complete video; check actual bytes
// even when Content-Length is omitted or disagrees with client metadata.
export function boundedVideoStream(
  source: ReadableStream<Uint8Array>,
  expected: number,
  signal?: AbortSignal,
  onError?: (error: unknown) => void,
  onComplete?: () => void,
) {
  const reader = source.getReader();
  let count = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        signal?.throwIfAborted();
        const { done, value } = await reader.read();
        signal?.throwIfAborted();
        if (done) {
          if (count !== expected)
            throw new VideoUploadError("UPLOAD_SIZE_MISMATCH");
          onComplete?.();
          controller.close();
          return;
        }
        count += value.byteLength;
        if (count > expected || count > MAX_VIDEO_BYTES)
          throw new VideoUploadError("UPLOAD_TOO_LARGE", 413);
        controller.enqueue(value);
      } catch (error) {
        onError?.(error);
        await reader.cancel().catch(() => {});
        controller.error(error);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
