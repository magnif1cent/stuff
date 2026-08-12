import { prisma } from "@/lib/prisma";
import { getFeaturedMovies } from "@/lib/weekly-featured";
import { getRatingSummaries, getTopRatedMovies } from "@/lib/ratings";
import { getRecentEditorialReviews } from "@/lib/editorial-reviews";
import { getRecentNewsPosts } from "@/lib/news";
import { HeroCarousel } from "@/components/hero-carousel";
import { MovieRail } from "@/components/movie-rail";
import { RecentReviewsFeed, type RecentReviewItem } from "@/components/recent-reviews-feed";
import { NewsList, type NewsPostItem } from "@/components/news-list";

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, recent, topRated, recentReviews, newsPosts] = await Promise.all([
    getFeaturedMovies(),
    prisma.movie.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 12 }),
    getTopRatedMovies(),
    getRecentEditorialReviews(),
    getRecentNewsPosts(),
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

  const newsItems: NewsPostItem[] = newsPosts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
  }));

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

      {newsItems.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-serif text-xl font-bold text-white">News &amp; Updates</h2>
            <a href="/news" className="text-sm text-red-500 hover:underline">
              View all →
            </a>
          </div>
          <NewsList posts={newsItems} />
        </section>
      )}

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

      <RecentReviewsFeed reviews={recentReviewItems} />
    </div>
  );
}
