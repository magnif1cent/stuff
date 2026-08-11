import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries } from "@/lib/fight-scenes";
import { MovieCard } from "@/components/movie-card";
import { FightSceneResultCard, type FightSceneResult } from "@/components/fight-scene-result-card";
import type { AddToListItem } from "@/components/add-to-list-control";
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

function FightSceneRow({
  title,
  scenes,
  signedIn,
}: {
  title: string;
  scenes: (FightSceneResult & { initialLists: AddToListItem[]; initialFavorite: boolean })[];
  signedIn: boolean;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {scenes.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing here yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {scenes.map((scene) => (
            <FightSceneResultCard
              key={scene.id}
              scene={scene}
              initialLists={scene.initialLists}
              signedIn={signedIn}
              initialFavorite={scene.initialFavorite}
            />
          ))}
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

  const [entries, fightSceneFavoriteEntries, memberLists] = await Promise.all([
    isOwner
      ? prisma.listEntry.findMany({
          where: { userId: profileUser.id },
          include: { movie: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
    isOwner
      ? prisma.fightSceneFavorite.findMany({
          where: { userId: profileUser.id },
          include: { fightScene: { include: { movie: { select: { id: true, title: true, releaseDate: true } }, tags: true } } },
          orderBy: { createdAt: "desc" },
        })
      : [],
    prisma.memberList.findMany({
      where: { userId: profileUser.id },
      include: {
        entries: { include: { movie: true }, orderBy: { createdAt: "desc" } },
        fightSceneEntries: {
          include: { fightScene: { include: { movie: { select: { id: true, title: true, releaseDate: true } }, tags: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const favorites = entries.filter((e) => e.listType === "FAVORITE").map((e) => e.movie);
  const watchlist = entries.filter((e) => e.listType === "WATCHLIST").map((e) => e.movie);

  // Same reasoning as pending movies: a soft-deleted fight scene shouldn't
  // linger visibly just because it was favorited before deletion.
  const favoriteFightScenes = fightSceneFavoriteEntries
    .filter((e) => !e.fightScene.isDeleted)
    .map((e) => e.fightScene);

  const visibleMemberLists = memberLists.map((list) => ({
    ...list,
    entries: isOwner ? list.entries : list.entries.filter((entry) => entry.movie.status === "APPROVED"),
    // Same reasoning as pending movies: a soft-deleted fight scene shouldn't
    // linger visibly just because it was saved before deletion.
    fightSceneEntries: list.fightSceneEntries.filter((entry) => !entry.fightScene.isDeleted),
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

  const allListedFightScenesById = new Map(
    [...visibleMemberLists.flatMap((list) => list.fightSceneEntries.map((e) => e.fightScene)), ...favoriteFightScenes].map(
      (scene) => [scene.id, scene],
    ),
  );
  const allListedFightScenes = [...allListedFightScenesById.values()];
  const [memberSceneSummaries, editorSceneSummaries] = await Promise.all([
    getFightSceneRatingSummaries(allListedFightScenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(allListedFightScenes.map((s) => s.id)),
  ]);

  // Not profileUser's own lists — the *viewer's* lists, so they can bookmark
  // a scene found here into one of their own, same as every other page a
  // fight scene card appears on.
  const viewerMemberLists = session?.user
    ? await prisma.memberList.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          fightSceneEntries: {
            where: { fightSceneId: { in: allListedFightScenes.map((s) => s.id) } },
            select: { fightSceneId: true },
          },
        },
      })
    : [];
  const viewerMemberListItems = viewerMemberLists.map((l) => ({ id: l.id, name: l.name }));

  // Same "viewer's own state, not the profile owner's" reasoning as
  // viewerMemberLists above — the favorite icon reflects who's looking,
  // regardless of whose profile the scene is shown on.
  const viewerFightSceneFavorites = session?.user
    ? await prisma.fightSceneFavorite.findMany({
        where: { userId: session.user.id, fightSceneId: { in: allListedFightScenes.map((s) => s.id) } },
      })
    : [];

  const withSceneRatings = (scene: (typeof allListedFightScenes)[number]) => ({
    ...scene,
    memberRatingAverage: memberSceneSummaries.get(scene.id)?.average ?? null,
    memberRatingCount: memberSceneSummaries.get(scene.id)?.count ?? 0,
    editorRatingAverage: editorSceneSummaries.get(scene.id)?.average ?? null,
    editorRatingCount: editorSceneSummaries.get(scene.id)?.count ?? 0,
  });

  const sceneInitialLists = (sceneId: string) =>
    viewerMemberListItems.map((l) => {
      const listRow = viewerMemberLists.find((row) => row.id === l.id)!;
      return { ...l, hasItem: listRow.fightSceneEntries.some((e) => e.fightSceneId === sceneId) };
    });

  const withSceneListState = (scene: (typeof allListedFightScenes)[number]) => ({
    ...withSceneRatings(scene),
    initialLists: sceneInitialLists(scene.id),
    initialFavorite: viewerFightSceneFavorites.some((e) => e.fightSceneId === scene.id),
  });

  const memberListData = visibleMemberLists.map((list) => ({
    id: list.id,
    name: list.name,
    movies: list.entries.map((entry) => withRatings(entry.movie)),
    fightScenes: list.fightSceneEntries.map((entry) => withSceneListState(entry.fightScene)),
  }));

  const favoriteFightSceneData = favoriteFightScenes.map(withSceneListState);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">{profileUser.username}</h1>

      {isOwner && (
        <>
          <MovieRow title="Favorites" movies={favorites} ratingSummaries={ratingSummaries} />
          <MovieRow title="Watchlist" movies={watchlist} ratingSummaries={ratingSummaries} />
          <FightSceneRow title="Favorite Fight Scenes" scenes={favoriteFightSceneData} signedIn={!!session?.user} />
        </>
      )}

      <h2 className="mb-4 text-xl font-bold text-white">{isOwner ? "Your Lists" : "Lists"}</h2>
      {isOwner ? (
        <MemberListManager initialLists={memberListData} viewerSignedIn={!!session?.user} />
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
            {list.movies.length === 0 && list.fightScenes.length === 0 ? (
              <p className="text-sm text-neutral-400">Nothing in this list yet.</p>
            ) : (
              <div className="flex flex-wrap gap-4">
                {list.movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
                {list.fightScenes.map((scene) => (
                  <FightSceneResultCard
                    key={scene.id}
                    scene={scene}
                    initialLists={scene.initialLists}
                    signedIn={!!session?.user}
                    initialFavorite={scene.initialFavorite}
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
