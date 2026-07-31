import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl } from "@/lib/tmdb";
import { getCommunityRatingSummary, getEditorsRatingSummary } from "@/lib/ratings";
import { getDiscussionPage } from "@/lib/discussion";
import { RatingWidget } from "@/components/rating-widget";
import { AdminRatingWidget } from "@/components/admin-rating-widget";
import { ListButtons } from "@/components/list-buttons";
import { DiscussionThread } from "@/components/discussion-thread";

export default async function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const movie = await prisma.movie.findUnique({
    where: { id },
    include: {
      genres: true,
      cast: {
        orderBy: { order: "asc" },
        include: { person: true },
      },
    },
  });

  if (!movie) {
    notFound();
  }

  const [communityRating, editorsRating, myRating, myListEntries, discussionPage] = await Promise.all([
    getCommunityRatingSummary(movie.id),
    getEditorsRatingSummary(movie.id),
    session?.user
      ? prisma.rating.findUnique({
          where: { userId_movieId: { userId: session.user.id, movieId: movie.id } },
        })
      : null,
    session?.user
      ? prisma.listEntry.findMany({ where: { userId: session.user.id, movieId: movie.id } })
      : [],
    getDiscussionPage(movie.id),
  ]);

  const myAdminRating = session?.user?.role === "ADMIN"
    ? await prisma.adminRating.findUnique({
        where: { adminId_movieId: { adminId: session.user.id, movieId: movie.id } },
      })
    : null;

  const backdropUrl = tmdbImageUrl(movie.backdropPath, "original");
  const posterUrl = tmdbImageUrl(movie.posterPath, "w342");
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const isFavorite = myListEntries.some((e) => e.listType === "FAVORITE");
  const isOnWatchlist = myListEntries.some((e) => e.listType === "WATCHLIST");

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
        <div className="relative aspect-2/3 w-40 shrink-0 overflow-hidden rounded-md bg-neutral-800 shadow-xl sm:w-56">
          {posterUrl ? (
            <Image src={posterUrl} alt={movie.title} fill sizes="224px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
              {movie.title}
            </div>
          )}
        </div>

        <div className="flex-1 pt-6 sm:pt-24">
          <h1 className="text-3xl font-bold text-white">
            {movie.title} {year && <span className="text-neutral-400">({year})</span>}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400">
            {movie.runtime && <span>{movie.runtime} min</span>}
            {movie.director && <span>Dir. {movie.director}</span>}
            {movie.country && <span>{movie.country}</span>}
          </div>

          {movie.genres.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {movie.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300"
                >
                  {genre.name}
                </span>
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

          <p className="mt-4 max-w-2xl text-neutral-300">{movie.overview}</p>

          <div className="mt-4">
            <ListButtons
              movieId={movie.id}
              initialFavorite={isFavorite}
              initialWatchlist={isOnWatchlist}
              signedIn={!!session?.user}
            />
          </div>

          <div className="mt-6 max-w-sm">
            <RatingWidget
              movieId={movie.id}
              initialScore={myRating?.score ?? null}
              signedIn={!!session?.user}
            />
          </div>

          {session?.user?.role === "ADMIN" && (
            <div className="mt-6 max-w-sm">
              <AdminRatingWidget
                movieId={movie.id}
                initialScore={myAdminRating?.score ?? null}
                initialNote={myAdminRating?.note ?? null}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {movie.cast.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white">Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {movie.cast.map((credit) => (
                <Link
                  key={credit.id}
                  href={`/people/${credit.person.id}`}
                  className="group w-28 shrink-0 text-center"
                >
                  <div className="relative mb-1 aspect-square overflow-hidden rounded-full bg-neutral-800">
                    {credit.person.profilePath ? (
                      <Image
                        src={tmdbImageUrl(credit.person.profilePath, "w200") ?? ""}
                        alt={credit.person.name}
                        fill
                        sizes="112px"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <p className="truncate text-xs font-medium text-neutral-100 group-hover:text-red-500">
                    {credit.person.name}
                  </p>
                  {credit.characterName && (
                    <p className="truncate text-xs text-neutral-500">{credit.characterName}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

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
