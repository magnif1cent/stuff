import Link from "next/link";
import { MovieCard } from "@/components/movie-card";
import { mobilePreview, type TimelineEraData } from "@/lib/timeline";

// A genuinely different view from the desktop axis, not an adaptation of
// it — every era gets the same capped, swipeable row regardless of how
// long it lasted or how many movies it holds, which sidesteps the axis's
// whole width-allocation problem (and its tap-target problem) entirely.
export function TimelineMobile({ eras }: { eras: TimelineEraData[] }) {
  const nonEmpty = eras.filter((era) => era.totalCount > 0);

  if (nonEmpty.length === 0) {
    return <p className="mt-8 text-sm text-neutral-400">No movies have a historical setting recorded yet.</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {nonEmpty.map((era) => {
        const preview = mobilePreview(era);
        const hasMore = era.totalCount > preview.length;
        return (
          <div key={era.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-serif text-base font-semibold text-neutral-200">{era.name}</span>
            </div>
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <span className="text-xs text-neutral-600">{era.years}</span>
              <span className="text-xs text-neutral-400">
                {era.totalCount} {era.totalCount === 1 ? "movie" : "movies"}
                {hasMore && (
                  <>
                    {" "}
                    &middot; <Link href={`/timeline/${era.key}`} className="text-red-500 hover:underline">View all →</Link>
                  </>
                )}
              </span>
            </div>
            <div className="-mx-4 overflow-x-auto px-4">
              <div className="flex w-fit gap-3">
                {preview.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    size="compact"
                    movie={{
                      id: movie.id,
                      title: movie.title,
                      releaseDate: movie.releaseDate,
                      posterPath: movie.posterPath,
                      posterOverrideUrl: movie.posterOverrideUrl,
                      tmdbRating: movie.tmdbRating,
                      communityAverage: movie.ratingAverage,
                      communityCount: movie.ratingCount,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
