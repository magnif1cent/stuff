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
  // Catalogued (non-deleted) fight scenes -- the clips actually watchable
  // on the site, not the member-edited Fight Count. Omitted by callers
  // that don't fetch it; no badge renders either way when it's 0.
  fightCount?: number;
};

// "compact" is used on the member profile page, where several sections of
// (potentially long) movie grids sit behind tabs — smaller cards fit more
// per row and per screen, which matters more there than on a page showing
// one curated section at a time. Every other caller keeps the original size.
const SIZE_CLASSES = {
  default: { link: "w-40 sm:w-48", sizes: "(max-width: 640px) 160px, 192px" },
  compact: { link: "w-28 sm:w-32", sizes: "(max-width: 640px) 112px, 128px" },
} as const;

// "hand-fist" (fill weight) from Phosphor Icons, MIT licensed
// (https://phosphoricons.com), inlined like the site's other icons rather
// than pulling in an icon package for one glyph.
function FistIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M232,120v8A104,104,0,0,1,127.63,232c-54-.19-98-42.06-103.12-94.78a4,4,0,0,1,5.56-4A35.94,35.94,0,0,0,72,122.59a35.92,35.92,0,0,0,53.94,2.33,40.36,40.36,0,0,0,12.87,13A47.94,47.94,0,0,0,120,176a8,8,0,0,0,8.67,8,8.21,8.21,0,0,0,7.33-8.26A32,32,0,0,1,168,144a8,8,0,0,0,8-8.53,8.18,8.18,0,0,0-8.25-7.47H160a24,24,0,0,1-24-24V88h64A32,32,0,0,1,232,120ZM44.73,120C55.57,119.6,64,110.37,64,99.52v-23C64,65.63,55.57,56.4,44.73,56A20,20,0,0,0,24,76v24A20,20,0,0,0,44.73,120Zm56,0c10.84-.39,19.27-9.62,19.27-20.47v-47c0-10.85-8.43-20.08-19.27-20.47A20,20,0,0,0,80,52v48A20,20,0,0,0,100.73,120ZM176,52a20,20,0,0,0-20.73-20C144.43,32.4,136,41.63,136,52.48V72h36a4,4,0,0,0,4-4Z" />
    </svg>
  );
}

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
        {/* Top-right, opposite the recommendation badges (top-left). */}
        {movie.fightCount ? (
          <div
            title={`${movie.fightCount} fight scene${movie.fightCount === 1 ? "" : "s"}`}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-white shadow backdrop-blur-sm"
          >
            <FistIcon />
            {movie.fightCount}
          </div>
        ) : null}
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
