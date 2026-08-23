"use client";

import { useEffect, useRef, useState } from "react";
import { ActorCard, type ActorCardData } from "@/components/actor-card";

const SCROLL_BY = 480;

// Actor-page counterpart of MovieRailTrack (src/components/movie-rail.tsx) --
// same scroll-arrows/edge-fade track on its own, without the section/title
// chrome, so it can sit inside the actor page's already-padded container the
// same way MovieRailTrack does for Known For on that same page.
export function ActorRailTrack({ actors }: { actors: ActorCardData[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [actors]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="group relative">
      {!atStart && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-neutral-950 to-transparent" />
      )}
      {!atEnd && (
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-neutral-950 to-transparent" />
      )}

      {!atStart && (
        <button
          type="button"
          onClick={() => scrollBy(-SCROLL_BY)}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          onClick={() => scrollBy(SCROLL_BY)}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className="rail-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {actors.map((actor) => (
          <ActorCard key={actor.id} actor={actor} />
        ))}
      </div>
    </div>
  );
}
