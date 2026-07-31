import { prisma } from "@/lib/prisma";
import { getFeaturedMovies } from "@/lib/weekly-featured";
import { getRatingSummaries } from "@/lib/ratings";
import { HeroCarousel } from "@/components/hero-carousel";
import { MovieCard } from "@/components/movie-card";

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, recent] = await Promise.all([
    getFeaturedMovies(),
    prisma.movie.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const ratingSummaries = await getRatingSummaries(recent.map((m) => m.id));

  return (
    <div className="flex flex-1 flex-col">
      <HeroCarousel movies={featured} />

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <h2 className="mb-4 text-xl font-bold text-white">Recently Added</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No movies in the catalog yet. An admin can import films from TMDB on the{" "}
            <a href="/admin/import" className="text-red-500 hover:underline">
              import page
            </a>
            .
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recent.map((movie) => {
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
      </section>
    </div>
  );
}
