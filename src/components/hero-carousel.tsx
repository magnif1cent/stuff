"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { Movie } from "@/generated/prisma/client";

export type FeaturedMovie = Pick<Movie, "id" | "title" | "overview" | "backdropPath" | "releaseDate">;

const ROTATE_MS = 6000;

export function HeroCarousel({ movies }: { movies: FeaturedMovie[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % movies.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [movies.length]);

  if (movies.length === 0) return null;

  const movie = movies[index];
  const backdropUrl = tmdbImageUrl(movie.backdropPath, "original");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <div className="relative h-72 w-full overflow-hidden sm:h-96">
      {backdropUrl ? (
        <Image
          key={movie.id}
          src={backdropUrl}
          alt={movie.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="h-full w-full bg-neutral-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

      <div className="absolute bottom-0 left-0 flex w-full flex-col gap-2 p-4 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
          Trending this week
        </p>
        <Link href={`/movies/${movie.id}`} className="w-fit">
          <h2 className="text-2xl font-bold text-white hover:text-red-400 sm:text-4xl">
            {movie.title} {year && <span className="text-neutral-400">({year})</span>}
          </h2>
        </Link>
        {movie.overview && (
          <p className="max-w-xl text-sm text-neutral-300 line-clamp-2 sm:text-base">
            {movie.overview}
          </p>
        )}
      </div>

      <div className="absolute bottom-3 right-4 flex gap-1.5 sm:right-8">
        {movies.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setIndex(i)}
            aria-label={`Show ${m.title}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-red-600" : "w-1.5 bg-neutral-500/70 hover:bg-neutral-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
