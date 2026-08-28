import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl, resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import { truncate } from "@/lib/text";
import {
  getCommunityRatingSummary,
  getEditorsRatingSummary,
  getSubcategoryRatingSummary,
  RATING_CATEGORIES,
} from "@/lib/ratings";
import { getMovieRecommenders } from "@/lib/movie-recommendations";
import { getDiscussionPage } from "@/lib/discussion";
import {
  getFightScenesForMovie,
  getFightSceneRatingSummaries,
  getFightSceneAdminRatingSummaries,
  getFightSceneTags,
  getFightSceneRoundNumbers,
} from "@/lib/fight-scenes";
import { getFunFactsForMovie, getFunFactVoteSummaries } from "@/lib/fun-facts";
import {
  getTopMemberReviews,
  getMemberReviewsCount,
  getMemberReviewVoteSummaries,
  MEMBER_REVIEWS_PREVIEW_COUNT,
} from "@/lib/member-reviews";
import { getSimilarMovies } from "@/lib/similar-movies";
import { RatingWidget } from "@/components/rating-widget";
import { MovieRail } from "@/components/movie-rail";
import { AdminRatingWidget } from "@/components/admin-rating-widget";
import { ListButtons } from "@/components/list-buttons";
import { AddToListControl } from "@/components/add-to-list-control";
import { DiscussionThread } from "@/components/discussion-thread";
import { FightSceneSection } from "@/components/fight-scene-section";
import { FunFactsSection } from "@/components/fun-facts-section";
import { ReviewsSection } from "@/components/reviews-section";
import { PosterOverrideControl } from "@/components/poster-override-control";
import { RecommendationControl } from "@/components/recommendation-control";
import { FightCountControl } from "@/components/fight-count-control";

const getMovie = cache((id: string) =>
  prisma.movie.findUnique({
    where: { id },
    include: {
      genres: true,
      cast: {
        orderBy: { order: "asc" },
        include: { person: true },
      },
    },
  }),
);

// Pending (member-submitted, not yet admin-approved) movies are invisible to
// everyone except the person who submitted them and admins/reviewers (who
// need to see it to review it) — everyone else gets the same 404 as a
// nonexistent movie, matching how it's already hidden from every public
// listing/search. generateMetadata is a side door onto the same data (page
// title, OG tags), so it needs the identical check, not just the page body.
function isMovieVisible(
  movie: { status: string; submittedById: string | null },
  session: Session | null,
) {
  return (
    movie.status === "APPROVED" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "REVIEWER" ||
    session?.user?.id === movie.submittedById
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [movie, session] = await Promise.all([getMovie(id), auth()]);
  if (!movie || !isMovieVisible(movie, session)) return {};

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const title = year ? `${movie.title} (${year})` : movie.title;
  const description = movie.overview
    ? truncate(movie.overview, 200)
    : `${movie.title} on Kung Fu Sauce.`;
  const image = resolvePosterUrl(movie, "w500");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const movie = await getMovie(id);

  if (!movie) {
    notFound();
  }

  if (!isMovieVisible(movie, session)) {
    notFound();
  }

  const [
    communityRating,
    editorsRating,
    subcategoryRating,
    myRating,
    myCategoryRatings,
    myListEntries,
    myMemberLists,
    myFightSceneFavorites,
    discussionPage,
    fightScenes,
    fightSceneTags,
    editorialReview,
    topMemberReviews,
    memberReviewsCount,
    myMemberReview,
    movieRecommenders,
    recentFightCountEdits,
    funFacts,
    collectionSiblings,
    similarMovies,
  ] = await Promise.all([
    getCommunityRatingSummary(movie.id),
    getEditorsRatingSummary(movie.id),
    getSubcategoryRatingSummary(movie.id),
    session?.user
      ? prisma.rating.findUnique({
          where: { userId_movieId: { userId: session.user.id, movieId: movie.id } },
        })
      : null,
    session?.user
      ? prisma.subcategoryRating.findMany({
          where: { userId: session.user.id, movieId: movie.id },
        })
      : [],
    session?.user
      ? prisma.listEntry.findMany({ where: { userId: session.user.id, movieId: movie.id } })
      : [],
    session?.user
      ? prisma.memberList.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "asc" },
          include: {
            entries: { where: { movieId: movie.id }, select: { id: true } },
            fightSceneEntries: { select: { fightSceneId: true } },
          },
        })
      : [],
    session?.user
      ? prisma.fightSceneFavorite.findMany({
          where: { userId: session.user.id, fightScene: { movieId: movie.id } },
        })
      : [],
    getDiscussionPage(movie.id),
    getFightScenesForMovie(movie.id),
    getFightSceneTags(),
    prisma.editorialReview.findUnique({
      where: { movieId: movie.id },
      include: { author: { select: { username: true } } },
    }),
    getTopMemberReviews(movie.id, MEMBER_REVIEWS_PREVIEW_COUNT),
    getMemberReviewsCount(movie.id),
    session?.user
      ? prisma.memberReview.findUnique({
          where: { movieId_authorId: { movieId: movie.id, authorId: session.user.id } },
        })
      : null,
    getMovieRecommenders(movie.id),
    prisma.fightCountEdit.findMany({
      where: { movieId: movie.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { editedBy: { select: { username: true } } },
    }),
    getFunFactsForMovie(movie.id),
    movie.collectionTmdbId
      ? prisma.movie.findMany({
          where: { collectionTmdbId: movie.collectionTmdbId, id: { not: movie.id }, status: "APPROVED" },
          select: { id: true, title: true },
          orderBy: { releaseDate: "asc" },
        })
      : [],
    getSimilarMovies(movie),
  ]);

  const myMemberListItems = myMemberLists.map((list) => ({
    id: list.id,
    name: list.name,
    hasItem: list.entries.length > 0,
  }));

  const myFavoriteFightSceneIds = myFightSceneFavorites.map((e) => e.fightSceneId);

  // Per fight scene, which of the member's lists already contain it — a
  // scene-scoped view of the same myMemberLists rows fetched above.
  const mySavedFightSceneListIds: Record<string, string[]> = {};
  for (const scene of fightScenes) {
    mySavedFightSceneListIds[scene.id] = myMemberLists
      .filter((list) => list.fightSceneEntries.some((e) => e.fightSceneId === scene.id))
      .map((list) => list.id);
  }

  const myAdminRating = session?.user?.role === "ADMIN"
    ? await prisma.adminRating.findUnique({
        where: { adminId_movieId: { adminId: session.user.id, movieId: movie.id } },
      })
    : null;

  const myAdminCategoryRatings = session?.user?.role === "ADMIN"
    ? await prisma.subcategoryAdminRating.findMany({
        where: { adminId: session.user.id, movieId: movie.id },
      })
    : [];

  const myCategoryRatingMap = Object.fromEntries(myCategoryRatings.map((r) => [r.category, r.score]));
  const myAdminCategoryRatingMap = Object.fromEntries(
    myAdminCategoryRatings.map((r) => [r.category, r.score]),
  );

  const fightSceneIds = fightScenes.map((s) => s.id);
  const funFactIds = funFacts.map((f) => f.id);
  const topMemberReviewIds = topMemberReviews.map((r) => r.id);
  const [
    fightSceneRatingSummaries,
    fightSceneAdminRatingSummaries,
    myFightSceneRatings,
    myFightSceneAdminRatings,
    fightSceneRoundNumbers,
    funFactVoteSummaries,
    myFunFactVotes,
    memberReviewVoteSummaries,
    myMemberReviewVotes,
  ] = await Promise.all([
    getFightSceneRatingSummaries(fightSceneIds),
    getFightSceneAdminRatingSummaries(fightSceneIds),
    session?.user
      ? prisma.fightSceneRating.findMany({
          where: { userId: session.user.id, fightSceneId: { in: fightSceneIds } },
        })
      : [],
    session?.user?.role === "ADMIN"
      ? prisma.fightSceneAdminRating.findMany({
          where: { adminId: session.user.id, fightSceneId: { in: fightSceneIds } },
        })
      : [],
    getFightSceneRoundNumbers(movie.id),
    getFunFactVoteSummaries(funFactIds),
    session?.user
      ? prisma.funFactVote.findMany({
          where: { userId: session.user.id, factId: { in: funFactIds } },
        })
      : [],
    getMemberReviewVoteSummaries(topMemberReviewIds),
    session?.user
      ? prisma.memberReviewVote.findMany({
          where: { userId: session.user.id, reviewId: { in: topMemberReviewIds } },
        })
      : [],
  ]);

  const backdropUrl = tmdbImageUrl(movie.backdropPath, "w1280");
  const posterUrl = resolvePosterUrl(movie, "w342");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const isFavorite = myListEntries.some((e) => e.listType === "FAVORITE");
  const isOnWatchlist = myListEntries.some((e) => e.listType === "WATCHLIST");

  // Rendered twice below: alongside the poster on desktop (sm:flex-row), but
  // after the overview on mobile -- on a single-column layout it would
  // otherwise land between the poster and the title (same DOM order as the
  // sidebar), showing Studio/Country/etc. before you've even seen what movie
  // you're looking at.
  const movieDetailsCard = (movie.studio ||
    movie.country ||
    movie.originalLanguage ||
    !!movie.revenue ||
    (movie.collectionName && collectionSiblings.length > 0)) && (
    <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <h3 className="font-cond mb-2 text-xs tracking-widest text-neutral-500 uppercase">Details</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {movie.studio && (
          <>
            <dt className="text-neutral-500">Studio</dt>
            <dd className="text-neutral-300">{movie.studio}</dd>
          </>
        )}
        {movie.country && (
          <>
            <dt className="text-neutral-500">Country</dt>
            <dd className="text-neutral-300">{movie.country}</dd>
          </>
        )}
        {movie.originalLanguage && (
          <>
            <dt className="text-neutral-500">Language</dt>
            <dd className="text-neutral-300">{movie.originalLanguage}</dd>
          </>
        )}
        {!!movie.revenue && (
          <>
            <dt className="text-neutral-500">Box Office</dt>
            <dd className="text-neutral-300">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(movie.revenue)}
            </dd>
          </>
        )}
        {movie.collectionName && collectionSiblings.length > 0 && (
          <>
            <dt className="text-neutral-500">Collection</dt>
            <dd>
              <Link
                href={`/collections/${movie.collectionTmdbId}`}
                className="text-red-500 underline decoration-red-800 underline-offset-2 hover:text-red-400"
              >
                {movie.collectionName}
              </Link>
              {" — "}
              {collectionSiblings.map((sibling, i) => (
                <span key={sibling.id}>
                  <Link
                    href={`/movies/${sibling.id}`}
                    className="text-red-500 underline decoration-red-800 underline-offset-2 hover:text-red-400"
                  >
                    {sibling.title}
                  </Link>
                  {i < collectionSiblings.length - 1 ? ", " : ""}
                </span>
              ))}
            </dd>
          </>
        )}
      </dl>
    </div>
  );

  const serializedFightScenes = fightScenes.map((scene) => {
    const summary = fightSceneRatingSummaries.get(scene.id);
    const adminSummary = fightSceneAdminRatingSummaries.get(scene.id);
    return {
      id: scene.id,
      roundNumber: fightSceneRoundNumbers.get(scene.id) ?? 0,
      title: scene.title,
      youtubeVideoId: scene.youtubeVideoId,
      youtubeStartSeconds: scene.youtubeStartSeconds,
      isVerified: scene.isVerified,
      submittedById: scene.submittedById,
      createdAt: scene.createdAt.toISOString(),
      updatedAt: scene.updatedAt.toISOString(),
      submittedBy: scene.submittedBy,
      cast: scene.cast,
      tags: scene.tags,
      ratingAverage: summary?.average ?? null,
      ratingCount: summary?.count ?? 0,
      adminRatingAverage: adminSummary?.average ?? null,
      adminRatingCount: adminSummary?.count ?? 0,
    };
  });

  const myFightSceneRatingMap = Object.fromEntries(myFightSceneRatings.map((r) => [r.fightSceneId, r.score]));
  const myFightSceneAdminRatingMap = Object.fromEntries(
    myFightSceneAdminRatings.map((r) => [r.fightSceneId, r.score]),
  );

  const castOptions = movie.cast.map((credit) => ({ id: credit.person.id, name: credit.person.name }));

  const serializedEditorialReview = editorialReview
    ? {
        content: editorialReview.content,
        updatedAt: editorialReview.updatedAt.toISOString(),
        author: editorialReview.author,
      }
    : null;

  const myMemberReviewVoteMap = new Map(myMemberReviewVotes.map((v) => [v.reviewId, v.value as 1 | -1]));
  const serializedMemberReviews = topMemberReviews.map((review) => {
    const summary = memberReviewVoteSummaries.get(review.id);
    return {
      id: review.id,
      content: review.content,
      authorId: review.authorId,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      author: review.author,
      up: summary?.up ?? 0,
      down: summary?.down ?? 0,
      myVote: myMemberReviewVoteMap.get(review.id) ?? null,
    };
  });

  const serializedFightCountEdits = recentFightCountEdits.map((edit) => ({
    id: edit.id,
    previousValue: edit.previousValue,
    newValue: edit.newValue,
    createdAt: edit.createdAt.toISOString(),
    editedBy: edit.editedBy,
  }));

  const myFunFactVoteMap = new Map(myFunFactVotes.map((v) => [v.factId, v.value as 1 | -1]));
  const serializedFunFacts = funFacts
    .map((fact) => {
      const summary = funFactVoteSummaries.get(fact.id);
      return {
        id: fact.id,
        content: fact.content,
        submittedById: fact.submittedById,
        createdAt: fact.createdAt.toISOString(),
        updatedAt: fact.updatedAt.toISOString(),
        submittedBy: fact.submittedBy,
        up: summary?.up ?? 0,
        down: summary?.down ?? 0,
        myVote: myFunFactVoteMap.get(fact.id) ?? null,
      };
    })
    .sort((a, b) => {
      const scoreDiff = b.up - b.down - (a.up - a.down);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Auto-link pool for Fun Facts: this movie's own cast and franchise
  // siblings only, not the whole site's actor/movie tables -- a small,
  // per-movie-bounded pool keeps false-positive matches unlikely without
  // needing an @mention-style input UI.
  const funFactMentionables = [
    ...movie.cast.map((credit) => ({ name: credit.person.name, href: `/actors/${credit.person.id}` })),
    ...collectionSiblings.map((sibling) => ({ name: sibling.title, href: `/movies/${sibling.id}` })),
  ];

  const serializedPosts = discussionPage.posts.map((post) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    replies: post.replies.map((reply) => ({
      ...reply,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    })),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative h-64 w-full sm:h-80">
        {backdropUrl ? (
          <Image src={backdropUrl} alt="" fill priority unoptimized sizes="100vw" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-neutral-950/30" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-8 sm:flex-row">
        <div className="w-40 shrink-0 sm:w-56">
          <div className="relative rounded-sm border border-neutral-600 bg-neutral-800 p-2 shadow-xl">
            {/* corner accents, so the mat reads as a mounted print rather
                than just padding around the poster */}
            <span className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <span className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <span className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-neutral-500" />
            <div className="relative aspect-2/3 overflow-hidden border border-neutral-700 bg-neutral-950">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  unoptimized={isTmdbUrl(posterUrl)}
                  sizes="224px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                  {movie.title}
                </div>
              )}
            </div>
          </div>
          {session?.user?.role === "ADMIN" && (
            <PosterOverrideControl movieId={movie.id} hasOverride={!!movie.posterOverrideUrl} />
          )}

          {movieDetailsCard && <div className="mt-4 hidden sm:block">{movieDetailsCard}</div>}
        </div>

        <div className="flex-1 pt-2">
          <div className="mb-3">
            <RecommendationControl
              movieId={movie.id}
              initialRecommenders={movieRecommenders}
              currentAdminId={session?.user?.role === "ADMIN" ? session.user.id : null}
              isAdmin={session?.user?.role === "ADMIN"}
            />
          </div>

          <div className="font-cond flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tracking-wide text-amber-500 uppercase">
            {movie.runtime && <span>{movie.runtime} min</span>}
            {movie.director && <span>Dir. {movie.director}</span>}
            {movie.certification && (
              <span className="rounded border border-neutral-500 px-1.5 text-xs font-semibold text-neutral-400 normal-case">
                {movie.certification}
              </span>
            )}
            {movie.trueFightCount != null && (
              <a
                href="#fight-count"
                title="Number of fights in the movie, maintained by members — click to view or edit"
                className="underline decoration-neutral-600 underline-offset-2 hover:text-amber-300"
              >
                Fight Count: {movie.trueFightCount}
              </a>
            )}
          </div>

          <h1 className="font-display mt-2 text-5xl text-balance text-white">
            {movie.title} {year && <span className="font-editorial text-2xl font-normal text-neutral-400">({year})</span>}
          </h1>

          {movie.tagline && (
            <p className="font-editorial mt-2 text-base text-neutral-400 italic">&ldquo;{movie.tagline}&rdquo;</p>
          )}

          {movie.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/search?genre=${encodeURIComponent(genre.name)}`}
                  className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300 underline decoration-neutral-600 underline-offset-2 hover:border-neutral-500 hover:text-white"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-baseline gap-10">
            <div>
              <p className="font-cond text-xs tracking-wider text-neutral-500 uppercase">Community Score</p>
              <p className="font-display mt-1 text-3xl text-amber-500">
                {communityRating.average ? communityRating.average.toFixed(1) : "—"}{" "}
                <span className="font-editorial text-sm font-normal text-neutral-500">/ 10 ({communityRating.count})</span>
              </p>
            </div>
            {editorsRating.count > 0 && (
              <div>
                <p className="font-cond text-xs tracking-wider text-neutral-500 uppercase">Editors&rsquo; Score</p>
                <p className="font-display mt-1 text-3xl text-neutral-100">
                  {editorsRating.average?.toFixed(1)}{" "}
                  <span className="font-editorial text-sm font-normal text-neutral-500">({editorsRating.count})</span>
                </p>
              </div>
            )}
          </div>

          {RATING_CATEGORIES.some(({ key }) => subcategoryRating[key].count > 0) && (
            <div className="font-cond mt-4 flex max-w-sm flex-col gap-1.5 text-sm tracking-widest">
              {RATING_CATEGORIES.map(({ key, label }) => {
                const community = subcategoryRating[key];
                if (community.count === 0) return null;
                return (
                  <div key={key} className="flex items-baseline justify-between uppercase">
                    <span className="text-neutral-400">{label}</span>
                    <span className="text-base font-semibold text-amber-500 tabular-nums">
                      {community.average!.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="font-editorial mt-4 max-w-2xl text-neutral-300">{movie.overview}</p>

          {movieDetailsCard && <div className="mt-4 max-w-2xl sm:hidden">{movieDetailsCard}</div>}

          <div className="mt-4 flex flex-wrap items-start gap-2">
            <ListButtons
              movieId={movie.id}
              initialFavorite={isFavorite}
              initialWatchlist={isOnWatchlist}
              signedIn={!!session?.user}
            />
            <AddToListControl
              target={{ type: "movie", id: movie.id }}
              initialLists={myMemberListItems}
              signedIn={!!session?.user}
            />
          </div>

          <div className="mt-6 max-w-sm">
            <RatingWidget
              movieId={movie.id}
              initialScore={myRating?.score ?? null}
              initialCategoryScores={myCategoryRatingMap}
              signedIn={!!session?.user}
            />
          </div>

          {session?.user?.role === "ADMIN" && (
            <div className="mt-6 max-w-sm">
              <AdminRatingWidget
                movieId={movie.id}
                initialScore={myAdminRating?.score ?? null}
                initialNote={myAdminRating?.note ?? null}
                initialCategoryScores={myAdminCategoryRatingMap}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {movie.cast.length > 0 && (
          <section className="mb-8">
            <h2 className="font-serif mb-4 text-xl font-bold text-white">Cast</h2>
            <div className="rail-scrollbar flex gap-4 overflow-x-auto pb-2">
              {movie.cast.map((credit) => (
                <Link key={credit.id} href={`/actors/${credit.person.id}`} className="w-28 shrink-0 text-center hover:opacity-80">
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-sm border border-neutral-700 bg-neutral-800">
                    {credit.person.profilePath ? (
                      <Image
                        src={tmdbImageUrl(credit.person.profilePath, "w200") ?? ""}
                        alt={credit.person.name}
                        fill
                        unoptimized
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-medium text-neutral-100">{credit.person.name}</p>
                  {credit.characterName && (
                    <p className="truncate text-xs text-neutral-500">{credit.characterName}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <ReviewsSection
          movieId={movie.id}
          initialAdminReview={serializedEditorialReview}
          initialMemberReviews={serializedMemberReviews}
          memberReviewsCount={memberReviewsCount}
          hasOwnReview={!!myMemberReview}
          signedIn={!!session?.user}
          currentUserId={session?.user?.id ?? null}
          isAdmin={session?.user?.role === "ADMIN"}
        />

        <FightCountControl
          movieId={movie.id}
          initialCount={movie.trueFightCount}
          recentEdits={serializedFightCountEdits}
          signedIn={!!session?.user}
        />

        <div id="fight-scenes">
          <FightSceneSection
            movieId={movie.id}
            initialFightScenes={serializedFightScenes}
            castOptions={castOptions}
            tagOptions={fightSceneTags}
            signedIn={!!session?.user}
            currentUserId={session?.user?.id ?? null}
            isAdmin={session?.user?.role === "ADMIN"}
            canVerify={session?.user?.role === "ADMIN" || session?.user?.role === "REVIEWER"}
            myRatings={myFightSceneRatingMap}
            myAdminRatings={myFightSceneAdminRatingMap}
            myMemberLists={myMemberLists.map((list) => ({ id: list.id, name: list.name }))}
            mySavedListIdsByScene={mySavedFightSceneListIds}
            myFavoriteSceneIds={myFavoriteFightSceneIds}
          />
        </div>

        <FunFactsSection
          movieId={movie.id}
          initialFacts={serializedFunFacts}
          signedIn={!!session?.user}
          currentUserId={session?.user?.id ?? null}
          isAdmin={session?.user?.role === "ADMIN"}
          mentionables={funFactMentionables}
        />
      </div>

      {similarMovies.length > 0 && (
        <MovieRail title="You Might Also Like" movies={similarMovies} cardSize="compact" />
      )}

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div id="discussion">
          <DiscussionThread
            movieId={movie.id}
            initialPosts={serializedPosts}
            initialNextCursor={discussionPage.nextCursor}
            signedIn={!!session?.user}
            currentUserId={session?.user?.id ?? null}
            isAdmin={session?.user?.role === "ADMIN"}
          />
        </div>
      </div>
    </div>
  );
}
