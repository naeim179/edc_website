"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { useLanguage } from "@/components/LanguageProvider";
import { createMuxPlaybackSession, fetchMuxPlaybackGrant } from "@/lib/mux-playback-session";

function VideoFeedback({ failed }: { failed: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="aspect-video flex items-center justify-center rounded-xl bg-black p-6 text-center text-white" role={failed ? "alert" : "status"}>
      {failed ? t.lessonVideo.playbackError : t.lessonVideo.playbackLoading}
    </div>
  );
}

function BunnyLessonVideo({ lessonId, title }: { lessonId: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/bunny/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Playback request failed");
      const result = await response.json();
      if (typeof result?.url !== "string") throw new Error("Invalid playback URL");
      if (!controller.signal.aborted) setUrl(result.url);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [lessonId]);

  if (!url) return <VideoFeedback failed={failed} />;

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <iframe
        src={url}
        title={title}
        className="h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

function MuxLessonVideo({ lessonId, playbackId, title }: { lessonId: string; playbackId: string; title: string }) {
  const player = useRef<MuxPlayerRefAttributes>(null);
  const session = useRef<ReturnType<typeof createMuxPlaybackSession> | null>(null);
  const [access, setAccess] = useState<{
    token: string;
    startTime?: number;
    autoPlay?: boolean;
    volume?: number;
    muted?: boolean;
    playbackRate?: number;
  } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const manager = createMuxPlaybackSession({
      load: signal => fetchMuxPlaybackGrant(lessonId, signal),
      isPlaying: () => Boolean(player.current && !player.current.paused && !player.current.ended),
      accept: token => {
        const current = player.current;
        setAccess({
          token,
          startTime: current && Number.isFinite(current.currentTime) ? Math.max(0, current.currentTime) : undefined,
          autoPlay: current ? !current.paused && !current.ended : undefined,
          volume: current?.volume,
          muted: current?.muted,
          playbackRate: current?.playbackRate,
        });
      },
      unavailable: () => {
        setAccess(null);
        setFailed(true);
      },
    });
    session.current = manager;
    return () => {
      session.current = null;
      manager.stop();
    };
  }, [lessonId]);

  if (!access) return <VideoFeedback failed={failed} />;

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <MuxPlayer
        key={access.token}
        ref={player}
        playbackId={playbackId}
        tokens={{ playback: access.token }}
        startTime={access.startTime}
        autoPlay={access.autoPlay}
        volume={access.volume}
        muted={access.muted}
        playbackRate={access.playbackRate}
        title={title}
        streamType="on-demand"
        className="h-full w-full"
        onPlay={() => void session.current?.refreshIfNeeded()}
        onError={() => void session.current?.refreshIfNeeded()}
      />
    </div>
  );
}

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
    return <MuxLessonVideo key={`${lessonId}:${muxPlaybackId}`} lessonId={lessonId} playbackId={muxPlaybackId} title={title} />;
  }

  if (
    provider === "bunny" &&
    bunnyLibraryId &&
    bunnyVideoId
  ) {
    return <BunnyLessonVideo key={`${lessonId}:${bunnyLibraryId}:${bunnyVideoId}`} lessonId={lessonId} title={title} />;
  }

  return (
    <div className="rounded-xl bg-red-50 p-8 text-center text-red-600">
      {t.lessonVideo.incomplete}
    </div>
  );
}
