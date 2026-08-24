import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries } from "@/lib/fight-scenes";
import { MovieCard } from "@/components/movie-card";
import { FightSceneResultCard } from "@/components/fight-scene-result-card";
import { LikeListButton } from "@/components/like-list-button";
import { ListDetailsForm } from "@/components/list-details-form";
import { RankedListReel, type ReelItem } from "@/components/ranked-list-reel";

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
          fightScene: {
            include: {
              movie: { select: { id: true, title: true, releaseDate: true } },
              tags: true,
              cast: { orderBy: { order: "asc" }, include: { person: true } },
            },
          },
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
  const [memberSummaries, editorSummaries] = await Promise.all([
    getFightSceneRatingSummaries(fightScenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(fightScenes.map((s) => s.id)),
  ]);

  // Not the list owner's saved-state — the *current viewer's own* lists, so
  // they can bookmark a scene they found here into one of their own lists,
  // same as every other page a fight scene card appears on.
  const myMemberLists = session?.user
    ? await prisma.memberList.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          fightSceneEntries: { where: { fightSceneId: { in: fightScenes.map((s) => s.id) } }, select: { fightSceneId: true } },
        },
      })
    : [];
  const myMemberListItems = myMemberLists.map((l) => ({ id: l.id, name: l.name }));

  const myFightSceneFavorites = session?.user
    ? await prisma.fightSceneFavorite.findMany({
        where: { userId: session.user.id, fightSceneId: { in: fightScenes.map((s) => s.id) } },
      })
    : [];

  // Only built (and only rendered) when the list opted into ranking — the
  // two entry tables stay separate (see the schema comment on
  // MemberListFightSceneEntry), so "one ranking across both" is this
  // in-app merge by `rank`, not a DB-level ordering. Rank ties (mainly
  // pre-migration rows that never got one) fall back to each table's own
  // createdAt-desc order, movies before fight scenes.
  const reelItems: ReelItem[] = !list.isRanked
    ? []
    : [
        ...list.entries
          .filter((entry) => movies.some((m) => m.id === entry.movieId))
          .map((entry): ReelItem => {
            const movie = movies.find((m) => m.id === entry.movieId)!;
            const summary = ratingSummaries.get(movie.id);
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
      ].sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));

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
      ) : list.isRanked ? (
        <RankedListReel listId={list.id} initialItems={reelItems} isOwnList={isOwnList} />
      ) : (
        <>
          {movies.length > 0 && (
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
          {fightScenes.length > 0 && (
            <div className={movies.length > 0 ? "mt-8" : ""}>
              {movies.length > 0 && <h2 className="mb-4 font-serif text-lg font-bold text-white">Fight Scenes</h2>}
              <div className="flex flex-wrap gap-4">
                {fightScenes.map((scene) => {
                  const memberSummary = memberSummaries.get(scene.id);
                  const editorSummary = editorSummaries.get(scene.id);
                  const initialLists = myMemberListItems.map((l) => {
                    const listRow = myMemberLists.find((row) => row.id === l.id)!;
                    return { ...l, hasItem: listRow.fightSceneEntries.some((e) => e.fightSceneId === scene.id) };
                  });
                  return (
                    <FightSceneResultCard
                      key={scene.id}
                      scene={{
                        ...scene,
                        memberRatingAverage: memberSummary?.average ?? null,
                        memberRatingCount: memberSummary?.count ?? 0,
                        editorRatingAverage: editorSummary?.average ?? null,
                        editorRatingCount: editorSummary?.count ?? 0,
                      }}
                      initialLists={initialLists}
                      signedIn={!!session?.user}
                      initialFavorite={myFightSceneFavorites.some((e) => e.fightSceneId === scene.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
