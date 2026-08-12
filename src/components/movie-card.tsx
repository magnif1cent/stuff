import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl } from "@/lib/tmdb";
import { RecommendedBadges } from "@/components/recommended-badge";
import type { MovieRecommender } from "@/lib/movie-recommendations";
import type { Movie } from "@/generated/prisma/client";

export type MovieCardData = Pick<
  Movie,
  "id" | "title" | "releaseDate" | "posterPath" | "posterOverrideUrl" | "tmdbRating"
> & {
  communityAverage?: number | null;
  communityCount?: number;
  recommendedBy?: MovieRecommender[];
};

export function MovieCard({ movie }: { movie: MovieCardData }) {
  const posterUrl = resolvePosterUrl(movie, "w342");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group flex w-40 shrink-0 flex-col gap-2 sm:w-48"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-neutral-800">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            sizes="(max-width: 640px) 160px, 192px"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
            {movie.title}
          </div>
        )}
        {movie.recommendedBy && movie.recommendedBy.length > 0 && (
          <div className="absolute top-1.5 left-1.5">
            <RecommendedBadges recommenders={movie.recommendedBy} />
          </div>
        )}
      </div>
      <div>
        <p className="truncate text-sm font-medium text-neutral-100 group-hover:text-red-500">
          {movie.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {year && <span>{year}</span>}
          {movie.communityAverage != null && (
            <span className="text-yellow-500">
              ★ {movie.communityAverage.toFixed(1)}
              {movie.communityCount ? ` (${movie.communityCount})` : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
