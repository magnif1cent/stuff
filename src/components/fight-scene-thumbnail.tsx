"use client";

import { useState } from "react";
import Link from "next/link";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 drop-shadow">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// Bare YouTube thumbnail image with a text fallback if it 404s (a removed or
// private video) — needs client-side state to swap content on error, hence
// this being pulled out of otherwise server-rendered callers. Absolutely
// positioned to fill a `position: relative` ancestor the caller provides.
export function YoutubeThumbnailImage({
  videoId,
  title,
  textClassName = "text-[9px]",
}: {
  videoId: string;
  title: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`flex h-full items-center justify-center px-1 text-center ${textClassName} tracking-wide uppercase`} style={{ color: "#e8dcc4" }}>
        {title}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
      alt=""
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export function FightSceneThumbnail({
  href,
  videoId,
  title,
  inkColor,
}: {
  href: string;
  videoId: string;
  title: string;
  inkColor: string;
}) {
  return (
    <Link
      href={href}
      className="group/thumb relative mx-auto block aspect-video w-2/3 max-w-[180px] overflow-hidden border-[3px]"
      style={{ borderColor: inkColor, backgroundColor: inkColor }}
    >
      <YoutubeThumbnailImage videoId={videoId} title={title} />
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white/90 transition group-hover/thumb:bg-black/30">
        <PlayIcon />
      </div>
    </Link>
  );
}
