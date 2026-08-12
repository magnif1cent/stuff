import { prisma } from "@/lib/prisma";
import { getFeaturedMovies } from "@/lib/weekly-featured";
import { getRatingSummaries, getTopRatedMovies } from "@/lib/ratings";
import { getMovieRecommendationsByMovieIds } from "@/lib/movie-recommendations";
import { getRecentEditorialReviews } from "@/lib/editorial-reviews";
import { getLatestNewsPost } from "@/lib/news";
import { HeroCarousel } from "@/components/hero-carousel";
import { MovieRail } from "@/components/movie-rail";
import { RecentReviewsFeed, type RecentReviewItem } from "@/components/recent-reviews-feed";
import { NewsTeaser } from "@/components/news-teaser";

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, recent, topRated, recentReviews, latestNewsPost] = await Promise.all([
    getFeaturedMovies(),
    prisma.movie.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 12 }),
    getTopRatedMovies(),
    getRecentEditorialReviews(),
    getLatestNewsPost(),
  ]);

  const recentReviewItems: RecentReviewItem[] = recentReviews.map((review) => ({
    id: review.id,
    content: review.content,
    updatedAt: review.updatedAt.toISOString(),
    movie: {
      ...review.movie,
      releaseDate: review.movie.releaseDate?.toISOString() ?? null,
    },
    author: review.author,
  }));

  const ratingSummaries = await getRatingSummaries(recent.map((m) => m.id));
  const recommendationsByMovieId = await getMovieRecommendationsByMovieIds([
    ...recent.map((m) => m.id),
    ...topRated.map((m) => m.id),
  ]);

  const recentWithRatings = recent.map((movie) => {
    const summary = ratingSummaries.get(movie.id);
    return {
      ...movie,
      communityAverage: summary?.average ?? null,
      communityCount: summary?.count ?? 0,
      recommendedBy: recommendationsByMovieId.get(movie.id) ?? [],
    };
  });

  const topRatedWithRecommendations = topRated.map((movie) => ({
    ...movie,
    recommendedBy: recommendationsByMovieId.get(movie.id) ?? [],
  }));

  return (
    <div className="flex flex-1 flex-col">
      <HeroCarousel movies={featured} />
      {latestNewsPost && <NewsTeaser title={latestNewsPost.title} />}

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
        movies={topRatedWithRecommendations}
        emptyMessage="No community ratings yet — be the first to rate a movie."
      />

      <RecentReviewsFeed reviews={recentReviewItems} />
    </div>
  );
}
