"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MovieCard, type MovieCardData } from "@/components/movie-card";
import { SectionHeading } from "@/components/section-heading";

const SCROLL_BY = 480;

// The scrollable track itself (arrows, edge-fade, horizontal scroller)
// around any row of cards -- shared by MovieRailTrack below and the
// homepage's Top Fights rail, whose cards aren't MovieCards.
export function RailScroller({ children, gapClassName = "gap-4" }: { children: ReactNode; gapClassName?: string }) {
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
  }, [children]);

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
          className="absolute left-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-100 transition hover:bg-black/70 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
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
          className="absolute right-1 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-100 transition hover:bg-black/70 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <div
        ref={scrollerRef}
        onScroll={updateEdges}
        className={`rail-scrollbar flex ${gapClassName} overflow-x-auto scroll-smooth pb-2`}
      >
        {children}
      </div>
    </div>
  );
}

// The movie card track on its own, without the section/title chrome
// MovieRail wraps it in below -- lets a caller that already provides its
// own heading and page-level container (e.g. a rail nested inside another
// page's section) drop in the same scroll behavior without a second nested
// max-width/padding wrapper.
export function MovieRailTrack({
  movies,
  cardSize = "rail",
  overlays,
}: {
  movies: MovieCardData[];
  cardSize?: "default" | "rail" | "compact";
  // Pre-rendered per-card overlay content keyed by movie id, not a render
  // callback -- a Server Component caller can't pass a function prop into
  // this Client Component (functions aren't serializable across that
  // boundary), but passing already-built React elements is fine.
  overlays?: Record<string, ReactNode>;
}) {
  return (
    <RailScroller>
      {movies.map((movie) => (
        <div key={movie.id} className="relative shrink-0">
          <MovieCard movie={movie} size={cardSize} />
          {/* Same top-right corner as MovieCard's "N fights" badge, so drop
              below it when there is one. The overlay can't live inside the
              card itself -- the card is a link, and overlays are buttons. */}
          {overlays?.[movie.id] && (
            <div className={`absolute right-2 ${movie.fightCount ? "top-9" : "top-2"}`}>{overlays[movie.id]}</div>
          )}
        </div>
      ))}
    </RailScroller>
  );
}

export function MovieRail({
  title,
  movies,
  emptyMessage,
  cardSize = "rail",
  seeAllHref,
}: {
  title: string;
  movies: MovieCardData[];
  emptyMessage?: React.ReactNode;
  cardSize?: "default" | "rail" | "compact";
  seeAllHref?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <SectionHeading title={title} seeAllHref={movies.length > 0 ? seeAllHref : undefined} />
      {movies.length === 0 ? (
        <p className="text-sm text-neutral-400">{emptyMessage}</p>
      ) : (
        <MovieRailTrack movies={movies} cardSize={cardSize} />
      )}
    </section>
  );
}
