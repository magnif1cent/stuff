import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <p className="text-neutral-400">Enter a movie title or actor name to search.</p>
      </div>
    );
  }

  const [titleMatches, castMatches] = await Promise.all([
    prisma.movie.findMany({ where: { title: { contains: query, mode: "insensitive" } } }),
    prisma.movie.findMany({
      where: { cast: { some: { person: { name: { contains: query, mode: "insensitive" } } } } },
    }),
  ]);

  const byId = new Map(titleMatches.map((m) => [m.id, m]));
  for (const movie of castMatches) {
    byId.set(movie.id, movie);
  }
  const results = [...byId.values()];
  const ratingSummaries = await getRatingSummaries(results.map((m) => m.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold text-white">
        Search results for &ldquo;{query}&rdquo;
      </h1>
      {results.length === 0 ? (
        <p className="text-neutral-400">No movies or actors matched your search.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {results.map((movie) => {
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
      )}
    </div>
  );
}
