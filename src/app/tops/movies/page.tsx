import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTopRatedMovies } from "@/lib/ratings";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Top 100 Movies",
  description: "The 100 highest community-rated kung fu and martial arts movies in the catalog.",
};

const TOP_MOVIES_LIMIT = 100;

export default async function TopMoviesPage() {
  const movies = await getTopRatedMovies(TOP_MOVIES_LIMIT);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 font-cond text-xs font-semibold tracking-widest text-red-500 uppercase">Tops</p>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-normal tracking-wide text-white">Top 100 Movies</h1>
        <Link href="/tops/fights" className="text-sm text-red-500 hover:underline">
          Top 100 Fights →
        </Link>
      </div>
      <p className="mb-8 max-w-2xl text-sm text-neutral-400">
        Ranked by average community rating (at least 2 ratings to qualify).
      </p>

      {movies.length === 0 ? (
        <p className="text-neutral-400">No community ratings yet — be the first to rate a movie.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {movies.map((movie, index) => {
            const posterUrl = resolvePosterUrl(movie, "w342");
            const isTop3 = index < 3;
            return (
              <Link key={movie.id} href={`/movies/${movie.id}`} className="group flex flex-col">
                <div className="relative aspect-2/3 w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-900">
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={movie.title}
                      fill
                      unoptimized={isTmdbUrl(posterUrl)}
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                      {movie.title}
                    </div>
                  )}
                  {/* Rank numeral stamped over the poster's corner, hollow so
                      the page background shows through the strokes — same
                      "poster-forward" idea as the movie detail hero. */}
                  <span
                    className="pointer-events-none absolute -bottom-3 -left-1 font-display text-5xl leading-none text-neutral-950"
                    style={{ WebkitTextStroke: `1.5px ${isTop3 ? "#ef4444" : "#f5f5f5"}` }}
                  >
                    {index + 1}
                  </span>
                </div>
                <div className="mt-4 min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-100 group-hover:text-red-500">
                    {movie.title}
                  </p>
                  {movie.communityAverage != null && (
                    <p className="text-xs text-neutral-500">
                      <span className="text-yellow-500">★ {movie.communityAverage.toFixed(1)}</span>{" "}
                      <span className="text-neutral-600">({movie.communityCount})</span>
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
