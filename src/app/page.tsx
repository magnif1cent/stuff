import { prisma } from "@/lib/prisma";
import { getFeaturedMovies } from "@/lib/weekly-featured";
import { getRatingSummaries, getTopEditorRatedMovies, getTopRatedMovies } from "@/lib/ratings";
import { getMovieRecommendationsByMovieIds } from "@/lib/movie-recommendations";
import {
  getFightSceneCountsByMovieIds,
  getTopEditorRatedFightScenes,
  getTopRatedFightScenes,
} from "@/lib/fight-scenes";
import { getRecentEditorialReviews } from "@/lib/editorial-reviews";
import { getLatestNewsPost } from "@/lib/news";
import { getRecentActivity } from "@/lib/activity";
import { HeroCarousel } from "@/components/hero-carousel";
import { MovieRail } from "@/components/movie-rail";
import { RecentReviewsFeed, type RecentReviewItem } from "@/components/recent-reviews-feed";
import { NewsTeaser } from "@/components/news-teaser";
import { ActivityFeed } from "@/components/activity-feed";
import { FightRail, type FightRailItem } from "@/components/fight-rail";

const TOP_FIGHTS_COUNT = 10;

export const revalidate = 3600;

export default async function HomePage() {
  const [featured, recent, communityTopRated, communityTopFights, recentReviews, latestNewsPost, recentActivity] =
    await Promise.all([
      getFeaturedMovies(),
      prisma.movie.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 12 }),
      getTopRatedMovies(),
      getTopRatedFightScenes(TOP_FIGHTS_COUNT),
      getRecentEditorialReviews(),
      getLatestNewsPost(),
      getRecentActivity(),
    ]);

  // Until some movie has enough member ratings to qualify, rank by the
  // Editors' Score instead of leaving the rail empty -- see DECISIONS.md.
  // The editors' average goes in the card's communityAverage slot, which
  // just renders a star score. The title stays "by the Community" either
  // way, at the site owner's request (see DECISIONS.md).
  const useEditorsFallback = communityTopRated.length === 0;
  const topRated = useEditorsFallback
    ? (await getTopEditorRatedMovies()).map(({ editorsAverage, ...movie }) => ({
        ...movie,
        communityAverage: editorsAverage,
      }))
    : communityTopRated;

  // Same Editors' rating fallback for Top Fights. "See all" then goes to the
  // fight search sorted by editor rating, since /tops/fights (community
  // ratings only) would still be empty.
  const useEditorsFightsFallback = communityTopFights.length === 0;
  const topFights: FightRailItem[] = useEditorsFightsFallback
    ? (await getTopEditorRatedFightScenes(TOP_FIGHTS_COUNT)).map((scene) => ({
        ...scene,
        average: scene.editorsAverage,
      }))
    : communityTopFights.map((scene) => ({
        ...scene,
        average: scene.communityAverage,
        count: scene.communityCount,
      }));

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

  const railMovieIds = [...recent.map((m) => m.id), ...topRated.map((m) => m.id)];
  const [ratingSummaries, recommendationsByMovieId, fightCountByMovieId] = await Promise.all([
    getRatingSummaries(recent.map((m) => m.id)),
    getMovieRecommendationsByMovieIds(railMovieIds),
    getFightSceneCountsByMovieIds(railMovieIds),
  ]);

  const recentWithRatings = recent.map((movie) => {
    const summary = ratingSummaries.get(movie.id);
    return {
      ...movie,
      communityAverage: summary?.average ?? null,
      communityCount: summary?.count ?? 0,
      recommendedBy: recommendationsByMovieId.get(movie.id) ?? [],
      fightCount: fightCountByMovieId.get(movie.id) ?? 0,
    };
  });

  const topRatedWithRecommendations = topRated.map((movie) => ({
    ...movie,
    recommendedBy: recommendationsByMovieId.get(movie.id) ?? [],
    fightCount: fightCountByMovieId.get(movie.id) ?? 0,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <section className="px-4 py-4 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-2xl uppercase leading-tight tracking-wide text-neutral-100 sm:text-4xl">
            The <em className="text-red-600">source</em> for kung fu cinema
          </h1>
          <p className="mt-1 hidden text-base text-neutral-400 sm:block">
            Built by martial arts fans. Rate the films, rank the fight scenes, trace who trained whom.
          </p>
        </div>
      </section>
      <HeroCarousel movies={featured} />
      {/* Latest Update sits under the carousel on desktop but below
          Recently Added on phones, so the movies follow the carousel
          directly on a small screen -- see DECISIONS.md. */}
      {latestNewsPost && (
        <div className="hidden sm:block">
          <NewsTeaser title={latestNewsPost.title} />
        </div>
      )}

      <MovieRail
        title="Recently Added"
        movies={recentWithRatings}
        seeAllHref="/search"
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
      {latestNewsPost && (
        <div className="border-t border-neutral-800 sm:hidden">
          <NewsTeaser title={latestNewsPost.title} />
        </div>
      )}

      {/* Top Fights sits between the two movie rails so two poster rows
          don't run back to back -- see DECISIONS.md. */}
      <FightRail
        title="Top Fights"
        seeAllHref={useEditorsFightsFallback ? "/search/fights?sort=editorRating" : "/tops/fights"}
        fights={topFights}
      />

      <MovieRail
        title="Top Rated by the Community"
        // /tops/movies only lists movies with 2+ member ratings, so it's
        // empty while this rail is on its Editors' Score fallback.
        seeAllHref={useEditorsFallback ? "/search?sort=rating" : "/tops/movies"}
        movies={topRatedWithRecommendations}
        emptyMessage="No community ratings yet — be the first to rate a movie."
      />

      <RecentReviewsFeed reviews={recentReviewItems} />

      <ActivityFeed activity={recentActivity} seeAllHrefs={{ fights: "/search/fights", lists: "/lists" }} />
    </div>
  );
}
