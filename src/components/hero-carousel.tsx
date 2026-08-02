"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { Movie } from "@/generated/prisma/client";

export type FeaturedMovie = Pick<Movie, "id" | "title" | "overview" | "backdropPath" | "releaseDate">;

const ROTATE_MS = 6000;
const FADE_MS = 700;

function Slide({ movie, active }: { movie: FeaturedMovie; active: boolean }) {
  const backdropUrl = tmdbImageUrl(movie.backdropPath, "original");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity ease-in-out ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {backdropUrl ? (
        <Image src={backdropUrl} alt={movie.title} fill priority sizes="100vw" className="object-cover" />
      ) : (
        <div className="h-full w-full bg-neutral-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

      <div className="absolute bottom-0 left-0 flex w-full flex-col gap-2 p-4 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
          Trending this week
        </p>
        <Link href={`/movies/${movie.id}`} className="w-fit">
          <h2 className="font-serif text-2xl font-bold text-white hover:text-red-400 sm:text-4xl">
            {movie.title} {year && <span className="text-neutral-400">({year})</span>}
          </h2>
        </Link>
        {movie.overview && (
          <p className="max-w-xl text-sm text-neutral-300 line-clamp-2 sm:text-base">
            {movie.overview}
          </p>
        )}
      </div>
    </div>
  );
}

export function HeroCarousel({ movies }: { movies: FeaturedMovie[] }) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const prevIndexRef = useRef(0);

  const goTo = useCallback(
    (next: number) => setIndex((next + movies.length) % movies.length),
    [movies.length],
  );

  // Briefly keep the outgoing slide mounted (fading out) so switching slides
  // crossfades instead of hard-cutting, without pre-loading every backdrop.
  useEffect(() => {
    const previous = prevIndexRef.current;
    prevIndexRef.current = index;
    if (previous === index) return;
    setPrevIndex(previous);
    const timer = setTimeout(() => setPrevIndex(null), FADE_MS);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (movies.length <= 1 || paused) return;
    const timer = setInterval(() => goTo(index + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, [movies.length, paused, index, goTo]);

  if (movies.length === 0) return null;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Trending this week"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goTo(index - 1);
        if (e.key === "ArrowRight") goTo(index + 1);
      }}
      className="group relative h-72 w-full overflow-hidden outline-none sm:h-96"
    >
      {prevIndex !== null && prevIndex !== index && (
        <Slide movie={movies[prevIndex]} active={false} />
      )}
      <Slide movie={movies[index]} active />

      {movies.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous movie"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100 sm:left-4"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next movie"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 focus-visible:opacity-100 group-hover:opacity-100 sm:right-4"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute bottom-3 right-4 flex gap-1.5 sm:right-8">
            {movies.map((m, i) => (
              <button
                key={m.id}
                onClick={() => goTo(i)}
                aria-label={`Show ${m.title}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-red-600" : "w-1.5 bg-neutral-500/70 hover:bg-neutral-300"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
