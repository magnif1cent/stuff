import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries, getCollectionRatingSummary } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collectionTmdbId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { collectionTmdbId: rawId } = await params;
  const { from } = await searchParams;
  const collectionTmdbId = Number(rawId);
  if (!Number.isInteger(collectionTmdbId)) {
    notFound();
  }

  const movies = await prisma.movie.findMany({
    where: { collectionTmdbId, status: "APPROVED" },
    orderBy: { releaseDate: "asc" },
  });
  if (movies.length === 0) {
    notFound();
  }

  const [ratingSummaries, collectionSummary] = await Promise.all([
    getRatingSummaries(movies.map((m) => m.id)),
    getCollectionRatingSummary(collectionTmdbId),
  ]);

  // Reached either from the Leaderboard's Top Franchises section or from a
  // movie page's own Collection link -- the latter passes `from` (the movie
  // id) so the breadcrumb returns to that movie instead of always claiming
  // (incorrectly) that Leaderboard is where the visitor came from. Looked up
  // in the collection's own already-fetched movies rather than a second
  // query, since the referring movie is necessarily one of them.
  const fromMovie = from ? movies.find((m) => m.id === from) : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 text-sm text-neutral-400">
        {fromMovie ? (
          <Link href={`/movies/${fromMovie.id}`} className="hover:text-white">
            ← Back to {fromMovie.title}
          </Link>
        ) : (
          <Link href="/leaderboard" className="hover:text-white">
            ← Back to Leaderboard
          </Link>
        )}
      </p>
      <h1 className="mb-2 font-serif text-2xl font-bold text-white">{movies[0].collectionName}</h1>
      <p className="mb-8 text-sm text-neutral-300">
        {movies.length} {movies.length === 1 ? "movie" : "movies"}
        {collectionSummary.average != null && (
          <>
            {" · "}
            <span className="text-yellow-500">★</span> {collectionSummary.average.toFixed(1)} average community
            rating ({collectionSummary.count} {collectionSummary.count === 1 ? "rating" : "ratings"})
          </>
        )}
      </p>

      <div className="flex flex-wrap gap-4">
        {movies.map((movie) => {
          const summary = ratingSummaries.get(movie.id);
          return (
            <MovieCard
              key={movie.id}
              movie={{
                ...movie,
                communityAverage: summary?.average ?? null,
                communityCount: summary?.count ?? 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
