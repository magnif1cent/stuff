import { prisma } from "@/lib/prisma";
import { getFeaturedMovies } from "@/lib/weekly-featured";
import { getRatingSummaries, getTopRatedMovies } from "@/lib/ratings";
import { HeroCarousel } from "@/components/hero-carousel";
import { MovieRail } from "@/components/movie-rail";

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, recent, topRated] = await Promise.all([
    getFeaturedMovies(),
    prisma.movie.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    getTopRatedMovies(),
  ]);

  const ratingSummaries = await getRatingSummaries(recent.map((m) => m.id));

  const recentWithRatings = recent.map((movie) => {
    const summary = ratingSummaries.get(movie.id);
    return {
      ...movie,
      communityAverage: summary?.average ?? null,
      communityCount: summary?.count ?? 0,
    };
  });

  return (
    <div className="flex flex-1 flex-col">
      <HeroCarousel movies={featured} />

      <MovieRail
        title="Recently Added"
        movies={recentWithRatings}
        emptyMessage={
          <>
            No movies in the catalog yet. An admin can import films from TMDB on the{" "}
            <a href="/admin/import" className="text-red-500 hover:underline">
              import page
            </a>
            .
          </>
        }
      />

      <MovieRail
        title="Top Rated by the Community"
        movies={topRated}
        emptyMessage="No community ratings yet — be the first to rate a movie."
      />
    </div>
  );
}
