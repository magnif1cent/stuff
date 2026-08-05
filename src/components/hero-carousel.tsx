"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { Movie } from "@/generated/prisma/client";

export type FeaturedMovie = Pick<Movie, "id" | "title" | "overview" | "backdropPath" | "releaseDate"> & {
  fightSceneClip: { youtubeVideoId: string; youtubeStartSeconds: number | null } | null;
};

const ROTATE_MS = 10000;
const FADE_MS = 700;
// Bounded short preview, not the whole clip — long enough to read as a fight,
// short enough to stay well under the rotation interval above so it isn't
// cut off mid-loop before the carousel advances.
const CLIP_SECONDS = 10;
// Backdrop shows first so landing on a slide doesn't immediately snap into
// motion — matches how Netflix/Disney+/Prime delay their hero previews.
const CLIP_START_DELAY_MS = 1500;

function clipEmbedUrl(videoId: string, startSeconds: number | null) {
  const start = startSeconds ?? 0;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    controls: "0",
    playsinline: "1",
    rel: "0",
    playlist: videoId,
    start: String(start),
    end: String(start + CLIP_SECONDS),
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function Slide({ movie, active, playClip }: { movie: FeaturedMovie; active: boolean; playClip: boolean }) {
  const backdropUrl = tmdbImageUrl(movie.backdropPath, "original");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const showClip = active && playClip && !!movie.fightSceneClip;

  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity ease-in-out ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {backdropUrl ? (
        <Image
          src={backdropUrl}
          alt={movie.title}
          fill
          priority
          sizes="100vw"
          className={`object-cover transition-opacity ${showClip ? "opacity-0" : "opacity-100"}`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
        />
      ) : (
        <div className="h-full w-full bg-neutral-900" />
      )}
      {showClip && movie.fightSceneClip && (
        <iframe
          key={movie.id}
          src={clipEmbedUrl(movie.fightSceneClip.youtubeVideoId, movie.fightSceneClip.youtubeStartSeconds)}
          title={`${movie.title} fight scene preview`}
          allow="autoplay; encrypted-media"
          // Larger than the visible frame and centered, so the YouTube
          // player's own letterboxing doesn't show through as black bars —
          // same crop-to-fill effect as the backdrop image's object-cover.
          className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 border-0"
        />
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
  // Which slide index the clip-start timer has fired for, if any — compared
  // against the current index at render time rather than a plain boolean, so
  // switching slides doesn't need an extra "reset to false" state update.
  const [clipReadyIndex, setClipReadyIndex] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const prevIndexRef = useRef(0);

  const goTo = useCallback(
    (next: number) => setIndex((next + movies.length) % movies.length),
    [movies.length],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

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

  // Landing on a slide always shows its backdrop first; the clip only takes
  // over after a short delay, and only if the slide is still the active one
  // and motion isn't disabled.
  useEffect(() => {
    if (reducedMotion) return;
    const timer = setTimeout(() => setClipReadyIndex(index), CLIP_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [index, reducedMotion]);

  const playClip = clipReadyIndex === index;

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
        <Slide movie={movies[prevIndex]} active={false} playClip={false} />
      )}
      <Slide movie={movies[index]} active playClip={playClip} />

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
