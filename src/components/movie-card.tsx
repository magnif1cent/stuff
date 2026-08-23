import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
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

// "compact" is used on the member profile page, where several sections of
// (potentially long) movie grids sit behind tabs — smaller cards fit more
// per row and per screen, which matters more there than on a page showing
// one curated section at a time. Every other caller keeps the original size.
const SIZE_CLASSES = {
  default: { link: "w-40 sm:w-48", sizes: "(max-width: 640px) 160px, 192px" },
  compact: { link: "w-28 sm:w-32", sizes: "(max-width: 640px) 112px, 128px" },
} as const;

export function MovieCard({ movie, size = "default" }: { movie: MovieCardData; size?: keyof typeof SIZE_CLASSES }) {
  const posterUrl = resolvePosterUrl(movie, "w342");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const { link, sizes } = SIZE_CLASSES[size];

  return (
    <Link href={`/movies/${movie.id}`} className={`group flex shrink-0 flex-col gap-2 ${link}`}>
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-neutral-800">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={movie.title}
            fill
            unoptimized={isTmdbUrl(posterUrl)}
            sizes={sizes}
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
            {movie.title}
          </div>
        )}
        {movie.recommendedBy && movie.recommendedBy.length > 0 && (
          <div className="absolute top-2 left-2">
            <RecommendedBadges recommenders={movie.recommendedBy} size="lg" />
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
