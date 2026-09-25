import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { getFightSceneRatingSummaries } from "@/lib/fight-scenes";
import { ListActionsMobile, ListActionsPanel, type ListActionsProps } from "@/components/list-actions";
import { ListItemRows, type ReelItem } from "@/components/list-item-rows";
import { ListAddItems } from "@/components/list-add-items";

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

  const isOwnList = session?.user?.id === list?.userId;
  // A private list 404s for everyone but its owner — same response as a
  // list that doesn't exist, so its existence isn't leaked either.
  if (!list || (list.isPrivate && !isOwnList)) {
    notFound();
  }

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
          href: `/movies/${scene.movieId}/fights/${scene.id}`,
          youtubeVideoId: scene.youtubeVideoId,
          movieId: scene.movieId,
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

  const actionsProps: ListActionsProps = {
    listId: list.id,
    isOwner: isOwnList,
    isPrivate: list.isPrivate,
    ownerUsername: list.user.username,
    likeCount: list._count.likes,
    itemCount: reelItems.length,
    initialLiked: !!myLike,
    signedIn: !!session?.user,
  };

  // Content left, actions in a side panel at lg:+ (see list-actions.tsx);
  // below lg the panel collapses into ListActionsMobile under the header.
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10 px-4 py-10">
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm text-neutral-400">List by {list.user.username}</p>
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{list.name}</h1>
          {list.isRanked && (
            <span className="rounded-full border border-red-900 bg-red-950/60 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-red-300 uppercase">
              Ranked
            </span>
          )}
          {list.isPrivate && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-neutral-300 uppercase">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-2.5 w-2.5">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Private
            </span>
          )}
        </div>
        {list.description && <p className="mt-2 max-w-2xl text-sm text-neutral-300">{list.description}</p>}
        <div className="mt-4 lg:hidden">
          <ListActionsMobile {...actionsProps} />
        </div>
        {isOwnList && (
          <div className="mt-6">
            <ListAddItems
              listId={list.id}
              isRanked={list.isRanked}
              order={reelItems.map((item) => ({ kind: item.kind, id: item.id }))}
            />
          </div>
        )}
        <div className="mt-6">
          {reelItems.length === 0 ? (
            <p className="text-neutral-400">
              {isOwnList ? "Nothing in this list yet. Search above to add a movie or fight." : "Nothing in this list yet."}
            </p>
          ) : (
            <ListItemRows listId={list.id} initialItems={reelItems} isRanked={list.isRanked} isOwnList={isOwnList} />
          )}
        </div>
      </div>
      <div className="hidden w-64 shrink-0 lg:block">
        <ListActionsPanel {...actionsProps} />
      </div>
    </div>
  );
}
