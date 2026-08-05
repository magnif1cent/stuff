import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";
import { LikeListButton } from "@/components/like-list-button";

export default async function PublicListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const session = await auth();

  const list = await prisma.memberList.findUnique({
    where: { id: listId },
    include: {
      user: { select: { username: true } },
      entries: { include: { movie: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { likes: true } },
    },
  });

  if (!list) {
    notFound();
  }

  const isOwnList = session?.user?.id === list.userId;
  const myLike = session?.user
    ? await prisma.memberListLike.findUnique({
        where: { userId_listId: { userId: session.user.id, listId } },
      })
    : null;

  // A pending movie could only have been added by its own submitter (the
  // only person who can see its page) — exclude it from what anyone else
  // views on this public list, same as every other public listing.
  const movies = list.entries.map((entry) => entry.movie).filter((movie) => movie.status === "APPROVED");
  const ratingSummaries = await getRatingSummaries(movies.map((m) => m.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 text-sm text-neutral-400">List by {list.user.username}</p>
      <h1 className="mb-4 text-2xl font-bold text-white">{list.name}</h1>
      {!isOwnList && (
        <div className="mb-6">
          <LikeListButton
            listId={list.id}
            initialLiked={!!myLike}
            initialLikeCount={list._count.likes}
            canLike={!!session?.user}
          />
        </div>
      )}
      {movies.length === 0 ? (
        <p className="text-neutral-400">No movies in this list yet.</p>
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
    </div>
  );
}
