"use client";

import { useEffect, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";

type Props = {
  provider: string | null;
  youtubeVideoId?: string | null;
  muxPlaybackId?: string | null;
  title: string;
};

export default function LessonVideoPlayer({
  provider,
  youtubeVideoId,
  muxPlaybackId,
  title,
}: Props) {
  const [muxToken, setMuxToken] = useState<string | null>(null);

  useEffect(() => {
    if (provider !== "mux" || !muxPlaybackId) return;

    fetch("/api/mux/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playbackId: muxPlaybackId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setMuxToken(data.token);
        }
      })
      .catch((error) => {
        console.error("MUX TOKEN ERROR", error);
      });
  }, [provider, muxPlaybackId]);

  if (!provider) {
    return (
      <div className="rounded-xl bg-gray-100 p-8 text-center text-gray-500">
        لا يوجد فيديو لهذا الدرس
      </div>
    );
  }

  if (provider === "youtube" && youtubeVideoId) {
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

  if (provider === "mux" && muxPlaybackId) {
    if (!muxToken) {
      return (
        <div className="aspect-video flex items-center justify-center rounded-xl bg-black text-white">
          Loading video...
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

  return (
    <div className="rounded-xl bg-red-50 p-8 text-center text-red-600">
      إعداد الفيديو غير مكتمل
    </div>
  );
}
