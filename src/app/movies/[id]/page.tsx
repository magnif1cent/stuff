import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl, resolvePosterUrl } from "@/lib/tmdb";
import { truncate } from "@/lib/text";
import {
  getCommunityRatingSummary,
  getEditorsRatingSummary,
  getSubcategoryRatingSummary,
  getSubcategoryEditorsRatingSummary,
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
import { RatingWidget } from "@/components/rating-widget";
import { AdminRatingWidget } from "@/components/admin-rating-widget";
import { ListButtons } from "@/components/list-buttons";
import { AddToListControl } from "@/components/add-to-list-control";
import { DiscussionThread } from "@/components/discussion-thread";
import { FightSceneSection } from "@/components/fight-scene-section";
import { EditorialReview } from "@/components/editorial-review";
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
    : `${movie.title} on Kung Fu Movie DB.`;
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
    subcategoryEditorsRating,
    myRating,
    myCategoryRatings,
    myListEntries,
    myMemberLists,
    myFightSceneFavorites,
    discussionPage,
    fightScenes,
    fightSceneTags,
    editorialReview,
    movieRecommenders,
    recentFightCountEdits,
  ] = await Promise.all([
    getCommunityRatingSummary(movie.id),
    getEditorsRatingSummary(movie.id),
    getSubcategoryRatingSummary(movie.id),
    getSubcategoryEditorsRatingSummary(movie.id),
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
    getMovieRecommenders(movie.id),
    prisma.fightCountEdit.findMany({
      where: { movieId: movie.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { editedBy: { select: { username: true } } },
    }),
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
  const [
    fightSceneRatingSummaries,
    fightSceneAdminRatingSummaries,
    myFightSceneRatings,
    myFightSceneAdminRatings,
    fightSceneRoundNumbers,
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
  ]);

  const backdropUrl = tmdbImageUrl(movie.backdropPath, "original");
  const posterUrl = resolvePosterUrl(movie, "w342");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const isFavorite = myListEntries.some((e) => e.listType === "FAVORITE");
  const isOnWatchlist = myListEntries.some((e) => e.listType === "WATCHLIST");
  const fightSceneCount = fightScenes.length;

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

  const serializedFightCountEdits = recentFightCountEdits.map((edit) => ({
    id: edit.id,
    previousValue: edit.previousValue,
    newValue: edit.newValue,
    createdAt: edit.createdAt.toISOString(),
    editedBy: edit.editedBy,
  }));

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
          <Image src={backdropUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-neutral-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-neutral-950/30" />
      </div>

      <div className="mx-auto -mt-24 flex w-full max-w-6xl flex-col gap-6 px-4 sm:flex-row">
        <div className="w-40 shrink-0 sm:w-56">
          <div className="relative aspect-2/3 overflow-hidden rounded-md bg-neutral-800 shadow-xl">
            {posterUrl ? (
              <Image src={posterUrl} alt={movie.title} fill sizes="224px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                {movie.title}
              </div>
            )}
          </div>
          {session?.user?.role === "ADMIN" && (
            <PosterOverrideControl movieId={movie.id} hasOverride={!!movie.posterOverrideUrl} />
          )}
        </div>

        <div className="flex-1 pt-6 sm:pt-24">
          <h1 className="font-serif text-3xl font-bold text-white">
            {movie.title} {year && <span className="text-neutral-400">({year})</span>}
          </h1>

          <div className="mt-2">
            <RecommendationControl
              movieId={movie.id}
              initialRecommenders={movieRecommenders}
              currentAdminId={session?.user?.role === "ADMIN" ? session.user.id : null}
              isAdmin={session?.user?.role === "ADMIN"}
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400">
            {movie.runtime && <span>{movie.runtime} min</span>}
            {movie.director && <span>Dir. {movie.director}</span>}
            {movie.country && <span>{movie.country}</span>}
            {fightSceneCount > 0 && (
              <span>
                {fightSceneCount} fight scene{fightSceneCount === 1 ? "" : "s"} cataloged
              </span>
            )}
          </div>

          <FightCountControl
            movieId={movie.id}
            initialCount={movie.trueFightCount}
            recentEdits={serializedFightCountEdits}
            signedIn={!!session?.user}
          />

          {movie.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
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

          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="text-sm text-neutral-400">Community Score</p>
              <p className="text-2xl font-bold text-yellow-500">
                {communityRating.average ? communityRating.average.toFixed(1) : "—"}{" "}
                <span className="text-sm font-normal text-neutral-500">/ 10 ({communityRating.count})</span>
              </p>
            </div>
            {editorsRating.count > 0 && (
              <div>
                <p className="text-sm text-neutral-400">Editors&rsquo; Score</p>
                <p className="text-2xl font-bold text-amber-500">
                  {editorsRating.average?.toFixed(1)}{" "}
                  <span className="text-sm font-normal text-neutral-500">/ 10 ({editorsRating.count})</span>
                </p>
              </div>
            )}
          </div>

          {RATING_CATEGORIES.some(
            ({ key }) => subcategoryRating[key].count > 0 || subcategoryEditorsRating[key].count > 0,
          ) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              {RATING_CATEGORIES.map(({ key, label }) => {
                const community = subcategoryRating[key];
                const editors = subcategoryEditorsRating[key];
                if (community.count === 0 && editors.count === 0) return null;
                return (
                  <span key={key}>
                    {label}:{" "}
                    {community.count > 0 && (
                      <span className="text-yellow-500">{community.average!.toFixed(1)}</span>
                    )}
                    {community.count > 0 && editors.count > 0 && " / "}
                    {editors.count > 0 && <span className="text-amber-500">{editors.average!.toFixed(1)}</span>}
                  </span>
                );
              })}
            </div>
          )}

          <p className="mt-4 max-w-2xl text-neutral-300">{movie.overview}</p>

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
            <h2 className="mb-4 font-serif text-xl font-bold text-white">Cast</h2>
            <div className="rail-scrollbar flex gap-4 overflow-x-auto pb-2">
              {movie.cast.map((credit) => (
                <Link key={credit.id} href={`/actors/${credit.person.id}`} className="w-28 shrink-0 text-center hover:opacity-80">
                  <div className="relative mb-1 aspect-square overflow-hidden rounded-full bg-neutral-800">
                    {credit.person.profilePath ? (
                      <Image
                        src={tmdbImageUrl(credit.person.profilePath, "w200") ?? ""}
                        alt={credit.person.name}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="truncate text-xs font-medium text-neutral-100">{credit.person.name}</p>
                  {credit.characterName && (
                    <p className="truncate text-xs text-neutral-500">{credit.characterName}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <EditorialReview
          movieId={movie.id}
          initialReview={serializedEditorialReview}
          isAdmin={session?.user?.role === "ADMIN"}
        />

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
  );
}
