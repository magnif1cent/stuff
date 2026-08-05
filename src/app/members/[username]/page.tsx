import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";
import { MemberListManager } from "@/components/member-list-manager";
import type { Movie } from "@/generated/prisma/client";

async function MovieRow({
  title,
  movies,
  ratingSummaries,
}: {
  title: string;
  movies: Pick<Movie, "id" | "title" | "releaseDate" | "posterPath" | "posterOverrideUrl" | "tmdbRating">[];
  ratingSummaries: Awaited<ReturnType<typeof getRatingSummaries>>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {movies.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing here yet.</p>
      ) : (
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
      )}
    </section>
  );
}

export default async function MemberProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();

  const profileUser = await prisma.user.findUnique({ where: { username } });
  if (!profileUser) {
    notFound();
  }

  // Favorites/Watchlist have always been private — only the owner ever sees
  // their own, on this page or anywhere else. Custom lists are public by
  // design (see README's Member Lists section), so anyone gets those, but a
  // pending (not yet admin-approved) movie inside one is still hidden from
  // everyone except the list owner, same as every other public listing.
  const isOwner = session?.user?.id === profileUser.id;

  const [entries, memberLists] = await Promise.all([
    isOwner
      ? prisma.listEntry.findMany({
          where: { userId: profileUser.id },
          include: { movie: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
    prisma.memberList.findMany({
      where: { userId: profileUser.id },
      include: { entries: { include: { movie: true }, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const favorites = entries.filter((e) => e.listType === "FAVORITE").map((e) => e.movie);
  const watchlist = entries.filter((e) => e.listType === "WATCHLIST").map((e) => e.movie);

  const visibleMemberLists = memberLists.map((list) => ({
    ...list,
    entries: isOwner ? list.entries : list.entries.filter((entry) => entry.movie.status === "APPROVED"),
  }));

  const allListedMovieIds = [
    ...favorites,
    ...watchlist,
    ...visibleMemberLists.flatMap((list) => list.entries.map((entry) => entry.movie)),
  ].map((m) => m.id);
  const ratingSummaries = await getRatingSummaries(allListedMovieIds);

  const withRatings = (movie: Movie) => ({
    ...movie,
    communityAverage: ratingSummaries.get(movie.id)?.average ?? null,
    communityCount: ratingSummaries.get(movie.id)?.count ?? 0,
  });

  const memberListData = visibleMemberLists.map((list) => ({
    id: list.id,
    name: list.name,
    movies: list.entries.map((entry) => withRatings(entry.movie)),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">{profileUser.username}</h1>

      {isOwner && (
        <>
          <MovieRow title="Favorites" movies={favorites} ratingSummaries={ratingSummaries} />
          <MovieRow title="Watchlist" movies={watchlist} ratingSummaries={ratingSummaries} />
        </>
      )}

      <h2 className="mb-4 text-xl font-bold text-white">{isOwner ? "Your Lists" : "Lists"}</h2>
      {isOwner ? (
        <MemberListManager initialLists={memberListData} />
      ) : memberListData.length === 0 ? (
        <p className="text-sm text-neutral-500">No public lists yet.</p>
      ) : (
        memberListData.map((list) => (
          <section key={list.id} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{list.name}</h3>
              <Link href={`/lists/${list.id}`} className="text-xs text-neutral-400 underline hover:text-white">
                Permalink
              </Link>
            </div>
            {list.movies.length === 0 ? (
              <p className="text-sm text-neutral-400">No movies in this list yet.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {list.movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
