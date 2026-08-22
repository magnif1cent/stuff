"use client";

import { useEffect, useRef, useState } from "react";
import { MovieCard, type MovieCardData } from "@/components/movie-card";

const SCROLL_BY = 480;

export function MovieRail({
  title,
  movies,
  emptyMessage,
  cardSize = "default",
}: {
  title: string;
  movies: MovieCardData[];
  emptyMessage?: React.ReactNode;
  cardSize?: "default" | "compact";
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Assume no overflow until measured, so the end-arrow/fade don't flash
  // in for a rail that never actually scrolls.
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 0);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  // Measure on mount/resize/content changes, since a rail that fits
  // entirely on screen shouldn't show scroll affordances at all.
  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [movies]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (movies.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <h2 className="mb-4 font-serif text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-neutral-400">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">{title}</h2>
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
            aria-label={`Scroll ${title} left`}
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
            aria-label={`Scroll ${title} right`}
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
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} size={cardSize} />
          ))}
        </div>
      </div>
    </section>
  );
}
