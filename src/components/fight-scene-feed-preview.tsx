"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { youtubeThumbnailUrl } from "@/lib/youtube";

// Throwaway companion to src/app/preview/fight-scene-feed/page.tsx — see
// that file's comment. Deliberately skips real favoriting/rating (no click
// handlers, no API calls) since the only thing being judged here is the
// swipe/autoplay feel, not the full feature.

const TICKET_INK = "#1a1712";
const TICKET_MUTED = "#6b6148";
const TICKET_STAMP = "#a4291e";

export interface FeedScene {
  id: string;
  title: string;
  youtubeVideoId: string;
  youtubeStartSeconds: number | null;
  movie: { id: string; title: string; releaseDate: Date | string | null };
  cast: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  memberRatingAverage: number | null;
  memberRatingCount: number;
  editorRatingAverage: number | null;
  editorRatingCount: number;
}

function embedUrl(videoId: string, startSeconds: number | null) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "1",
    playsinline: "1",
    rel: "0",
  });
  if (startSeconds) params.set("start", String(startSeconds));
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function Card({ scene, active }: { scene: FeedScene; active: boolean }) {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setTabHidden(document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const year = scene.movie.releaseDate ? new Date(scene.movie.releaseDate).getFullYear() : null;
  const playVideo = active && !reducedMotion && !tabHidden;

  return (
    <section className="relative h-dvh w-full shrink-0 snap-start snap-always bg-black">
      {playVideo ? (
        <iframe
          key={scene.id}
          src={embedUrl(scene.youtubeVideoId, scene.youtubeStartSeconds)}
          title={scene.title}
          allow="autoplay; encrypted-media"
          className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 border-0"
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: `url(${youtubeThumbnailUrl(scene.youtubeVideoId)})` }}
        />
      )}

      {/* "Fight Ticket" overlay — same cream/ink/stamp palette as
          fight-scene-result-card.tsx, carried into the full-screen view. */}
      <div
        className="absolute inset-x-0 bottom-0 px-4 pt-4 pb-6 font-mono"
        style={{
          color: TICKET_INK,
          background: "rgba(232, 220, 196, 0.96)",
          clipPath: "polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] tracking-wider uppercase" style={{ color: TICKET_MUTED }}>
              {scene.movie.title} {year && `(${year})`}
            </p>
            <p className="mt-0.5 truncate text-lg font-bold" style={{ fontFamily: "Georgia, serif" }}>
              {scene.title}
            </p>
          </div>
          {scene.memberRatingAverage !== null && (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
              style={{ borderColor: TICKET_STAMP, color: TICKET_STAMP, transform: "rotate(-8deg)" }}
            >
              {scene.memberRatingAverage.toFixed(1)}
            </div>
          )}
        </div>
        {scene.cast.length > 0 && (
          <p className="mt-2 truncate text-[11px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
            Featuring {scene.cast.map((c) => c.name).join(", ")}
          </p>
        )}
        {scene.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {scene.tags.map((tag) => (
              <span
                key={tag.id}
                className="border px-2 py-0.5 text-[10px] tracking-wide uppercase"
                style={{ borderColor: TICKET_INK }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function FightSceneFeedPreview({ scenes }: { scenes: FeedScene[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = cardRefs.current.findIndex((el) => el === entry.target);
            if (index !== -1) setActiveIndex(index);
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [scenes.length]);

  if (scenes.length === 0) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-neutral-950 text-neutral-400">
        No verified fight scenes to preview yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href="/search/fight-scenes"
        className="fixed left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
        aria-label="Exit preview"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <div ref={containerRef} className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll">
        {scenes.map((scene, i) => (
          <div key={scene.id} ref={(el) => { cardRefs.current[i] = el; }}>
            <Card scene={scene} active={i === activeIndex} />
          </div>
        ))}
      </div>
    </div>
  );
}
