import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries, getCollectionRatingSummary } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collectionTmdbId: string }>;
}) {
  const { collectionTmdbId: rawId } = await params;
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 text-sm text-neutral-400">
        <Link href="/leaderboard" className="hover:text-white">
          ← Back to Leaderboard
        </Link>
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
