export type LessonVideoProvider =
  | "youtube"
  | "mux"
  | "bunny";

const YOUTUBE_ID =
  /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(
  value: string
) {
  const input = value.trim();

  if (YOUTUBE_ID.test(input)) {
    return input;
  }

  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    return null;
  }

  const host = url.hostname
    .toLowerCase()
    .replace(/^(www|m)\./, "");

  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId =
      url.pathname.split("/")[1] ??
      null;
  }

  if (
    host === "youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    if (url.pathname === "/watch") {
      videoId =
        url.searchParams.get("v");
    } else {
      const match =
        url.pathname.match(
          /^\/(?:embed|shorts|live|v)\/([^/?#]+)/
        );

      videoId =
        match?.[1] ?? null;
    }
  }

  return videoId &&
    YOUTUBE_ID.test(videoId)
    ? videoId
    : null;
}

export function buildYouTubeUrl(
  videoId: string
) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function readLessonVideoForm(
  formData: FormData
) {
  const provider = String(
    formData.get("video_provider") ??
      "youtube"
  ).trim();

  if (provider === "youtube") {
    const youtubeVideoId =
      extractYouTubeVideoId(
        String(
          formData.get("youtube_url") ?? ""
        ).trim()
      );

    if (!youtubeVideoId) {
      throw new Error(
        "رابط YouTube غير صالح"
      );
    }

    return {
      video_provider: "youtube" as const,
      youtube_video_id: youtubeVideoId,
      mux_asset_id: null,
      mux_playback_id: null,
      bunny_library_id: null,
      bunny_video_id: null,
    };
  }

  if (provider === "mux") {
    const muxPlaybackId = String(
      formData.get("mux_playback_id") ?? ""
    ).trim();

    const muxAssetId = String(
      formData.get("mux_asset_id") ?? ""
    ).trim();

    if (!muxPlaybackId) {
      throw new Error(
        "Mux Playback ID مطلوب"
      );
    }

    return {
      video_provider: "mux" as const,
      youtube_video_id: null,
      mux_asset_id: muxAssetId || null,
      mux_playback_id: muxPlaybackId,
      bunny_library_id: null,
      bunny_video_id: null,
    };
  }

  if (provider === "bunny") {
    const bunnyLibraryId = String(
      formData.get("bunny_library_id") ?? ""
    ).trim();

    const bunnyVideoId = String(
      formData.get("bunny_video_id") ?? ""
    ).trim();

    if (!bunnyLibraryId || !bunnyVideoId) {
      throw new Error(
        "Bunny Library ID و Video ID مطلوبين"
      );
    }

    return {
      video_provider: "bunny" as const,
      youtube_video_id: null,
      mux_asset_id: null,
      mux_playback_id: null,
      bunny_library_id: bunnyLibraryId,
      bunny_video_id: bunnyVideoId,
    };
  }

  throw new Error(
    "نوع الفيديو غير صالح"
  );
}
