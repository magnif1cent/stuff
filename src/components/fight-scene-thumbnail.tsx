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

// A plain <img> (not next/image) with an onError fallback needs client-side
// state to swap content, hence this being pulled out of the otherwise
// server-rendered FightSceneResultCard.
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
  const [failed, setFailed] = useState(false);

  return (
    <Link
      href={href}
      className="group/thumb relative mx-auto block aspect-video w-2/3 max-w-[180px] overflow-hidden border-[3px]"
      style={{ borderColor: inkColor, backgroundColor: inkColor }}
    >
      {failed ? (
        <div className="flex h-full items-center justify-center px-2 text-center text-[9px] tracking-wide uppercase" style={{ color: "#e8dcc4" }}>
          {title}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white/90 transition group-hover/thumb:bg-black/30">
        <PlayIcon />
      </div>
    </Link>
  );
}
