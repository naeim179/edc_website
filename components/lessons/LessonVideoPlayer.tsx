"use client";

import { useEffect, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { useLanguage } from "@/components/LanguageProvider";

type Props = {
  lessonId: string;
  provider: string | null;
  youtubeVideoId?: string | null;
  muxPlaybackId?: string | null;
  bunnyLibraryId?: string | null;
  bunnyVideoId?: string | null;
  title: string;
};

export default function LessonVideoPlayer({
  lessonId,
  provider,
  youtubeVideoId,
  muxPlaybackId,
  bunnyLibraryId,
  bunnyVideoId,
  title,
}: Props) {
  const { t } = useLanguage();
  const [muxAccess, setMuxAccess] = useState<{
    lessonId: string;
    token?: string;
    error?: boolean;
  } | null>(null);

  useEffect(() => {
    if (
      provider !== "mux" ||
      !muxPlaybackId
    ) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/mux/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lessonId,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Video access unavailable");
        return res.json();
      })
      .then((data) => {
        if (typeof data.token !== "string") throw new Error("Missing video token");
        if (!controller.signal.aborted) setMuxAccess({ lessonId, token: data.token });
      })
      .catch(() => {
        if (!controller.signal.aborted) setMuxAccess({ lessonId, error: true });
      });
    return () => controller.abort();
  }, [provider, muxPlaybackId, lessonId]);

  if (!provider) {
    return (
      <div className="rounded-xl bg-gray-100 p-8 text-center text-gray-500">
        {t.lessonVideo.noVideo}
      </div>
    );
  }

  if (
    provider === "youtube" &&
    youtubeVideoId
  ) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}`}
          title={title}
          className="h-full w-full"
          allowFullScreen
        />
      </div>
    );
  }

  if (
    provider === "mux" &&
    muxPlaybackId
  ) {
    const currentAccess = muxAccess?.lessonId === lessonId ? muxAccess : null;
    const muxToken = currentAccess?.token;
    if (currentAccess?.error) {
      return (
        <div className="aspect-video flex items-center justify-center rounded-xl bg-black p-6 text-center text-white" role="alert">
          {t.lessonVideo.playbackError}
        </div>
      );
    }
    if (!muxToken) {
      return (
        <div className="aspect-video flex items-center justify-center rounded-xl bg-black text-white">
          {t.lessonVideo.playbackLoading}
        </div>
      );
    }

    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <MuxPlayer
          playbackId={muxPlaybackId}
          tokens={{
            playback: muxToken,
          }}
          title={title}
          streamType="on-demand"
          className="h-full w-full"
        />
      </div>
    );
  }

  if (
    provider === "bunny" &&
    bunnyLibraryId &&
    bunnyVideoId
  ) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${bunnyLibraryId}/${bunnyVideoId}`}
          title={title}
          className="h-full w-full"
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-red-50 p-8 text-center text-red-600">
      {t.lessonVideo.incomplete}
    </div>
  );
}
