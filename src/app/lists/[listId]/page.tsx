import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { getFightSceneRatingSummaries } from "@/lib/fight-scenes";
import { LikeListButton } from "@/components/like-list-button";
import { ListDetailsForm } from "@/components/list-details-form";
import { ListRankToggle } from "@/components/list-rank-toggle";
import { ListItemRows, type ReelItem } from "@/components/list-item-rows";

export default async function PublicListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const session = await auth();

  const list = await prisma.memberList.findUnique({
    where: { id: listId },
    include: {
      user: { select: { username: true } },
      entries: { include: { movie: true }, orderBy: { createdAt: "desc" } },
      fightSceneEntries: {
        include: {
          // Only movie is needed — ListItemRows shows title/rating/movie
          // context, not cast or tags (those backed the old per-type grid's
          // FightSceneResultCard, which this page no longer renders).
          fightScene: { include: { movie: { select: { id: true, title: true, releaseDate: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
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

  // Same reasoning as pending movies: a soft-deleted fight scene shouldn't
  // linger visibly just because it was saved before deletion.
  const fightScenes = list.fightSceneEntries.map((entry) => entry.fightScene).filter((scene) => !scene.isDeleted);
  const memberSummaries = await getFightSceneRatingSummaries(fightScenes.map((s) => s.id));

  // One row layout for every list, ranked or not (see ListItemRows) — the
  // two entry tables stay separate (see the schema comment on
  // MemberListFightSceneEntry), so merging movies and fight scenes into one
  // sequence, in either mode, is this in-app step, not a DB-level ordering.
  // `createdAtByKey` is sort-only scratch state, kept out of ReelItem itself
  // (which client components serialize) so it doesn't leak fields the UI
  // never uses.
  const createdAtByKey = new Map<string, number>();
  const reelItems: ReelItem[] = [
    ...list.entries
      .filter((entry) => movies.some((m) => m.id === entry.movieId))
      .map((entry): ReelItem => {
        const movie = movies.find((m) => m.id === entry.movieId)!;
        const summary = ratingSummaries.get(movie.id);
        createdAtByKey.set(`MOVIE-${movie.id}`, entry.createdAt.getTime());
        return {
          kind: "MOVIE",
          id: movie.id,
          rank: entry.rank,
          note: entry.note,
          title: movie.title,
          href: `/movies/${movie.id}`,
          posterPath: movie.posterPath,
          posterOverrideUrl: movie.posterOverrideUrl,
          releaseYear: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
          ratingAverage: summary?.average ?? null,
          ratingCount: summary?.count ?? 0,
        };
      }),
    ...list.fightSceneEntries
      .filter((entry) => fightScenes.some((s) => s.id === entry.fightSceneId))
      .map((entry): ReelItem => {
        const scene = fightScenes.find((s) => s.id === entry.fightSceneId)!;
        const memberSummary = memberSummaries.get(scene.id);
        createdAtByKey.set(`FIGHT_SCENE-${scene.id}`, entry.createdAt.getTime());
        return {
          kind: "FIGHT_SCENE",
          id: scene.id,
          rank: entry.rank,
          note: entry.note,
          title: scene.title,
          href: `/movies/${scene.movieId}/fight-scenes/${scene.id}`,
          youtubeVideoId: scene.youtubeVideoId,
          movieTitle: scene.movie.title,
          ratingAverage: memberSummary?.average ?? null,
          ratingCount: memberSummary?.count ?? 0,
        };
      }),
  ].sort((a, b) =>
    list.isRanked
      ? (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
      : createdAtByKey.get(`${b.kind}-${b.id}`)! - createdAtByKey.get(`${a.kind}-${a.id}`)!,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 text-sm text-neutral-400">List by {list.user.username}</p>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{list.name}</h1>
        {list.isRanked && (
          <span className="rounded-full border border-red-900 bg-red-950/60 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-red-300 uppercase">
            Ranked
          </span>
        )}
      </div>
      {list.description && <p className="mt-2 max-w-2xl text-sm text-neutral-300">{list.description}</p>}
      <div className="mt-4 mb-6">
        {isOwnList ? (
          <ListDetailsForm
            listId={list.id}
            initialName={list.name}
            initialDescription={list.description}
            initialIsRanked={list.isRanked}
          />
        ) : (
          <LikeListButton
            listId={list.id}
            initialLiked={!!myLike}
            initialLikeCount={list._count.likes}
            canLike={!!session?.user}
          />
        )}
      </div>
      {movies.length === 0 && fightScenes.length === 0 ? (
        <p className="text-neutral-400">Nothing in this list yet.</p>
      ) : (
        <>
          {isOwnList && <ListRankToggle listId={list.id} initialIsRanked={list.isRanked} />}
          <ListItemRows listId={list.id} initialItems={reelItems} isRanked={list.isRanked} isOwnList={isOwnList} />
        </>
      )}
    </div>
  );
}
