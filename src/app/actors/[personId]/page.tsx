import { cache } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl, getTmdbPersonDetails } from "@/lib/tmdb";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries, getFightSceneFavoriteCounts } from "@/lib/fight-scenes";
import { MovieCard } from "@/components/movie-card";
import { FightSceneResultCard } from "@/components/fight-scene-result-card";
import { getRatingSummaries } from "@/lib/ratings";

const getPerson = cache((personId: string) =>
  prisma.person.findUnique({
    where: { id: personId },
    include: {
      castCredits: { include: { movie: true }, orderBy: { movie: { releaseDate: "desc" } } },
      fightSceneAppearances: {
        include: {
          fightScene: {
            include: {
              movie: { select: { id: true, title: true, releaseDate: true } },
              tags: true,
              cast: { orderBy: { order: "asc" }, include: { person: true } },
            },
          },
        },
        orderBy: { fightScene: { createdAt: "desc" } },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  const person = await getPerson(personId);
  if (!person) return {};

  const knownFor = person.castCredits
    .filter((c) => c.movie.status === "APPROVED")
    .slice(0, 3)
    .map((c) => c.movie.title);
  const description =
    knownFor.length > 0
      ? `${person.name}, known for ${knownFor.join(", ")}, on Kung Fu Sauce.`
      : `${person.name} on Kung Fu Sauce.`;
  const image = tmdbImageUrl(person.profilePath, "w500");

  return {
    title: person.name,
    description,
    openGraph: {
      title: person.name,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: person.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ActorPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const session = await auth();

  const person = await getPerson(personId);
  if (!person) {
    notFound();
  }

  const bio = await getTmdbPersonDetails(person.tmdbId).catch(() => null);

  // A pending (not yet admin-approved) movie is excluded the same way it's
  // excluded from every other public listing.
  const movies = person.castCredits.map((c) => c.movie).filter((m) => m.status === "APPROVED");
  const ratingSummaries = await getRatingSummaries(movies.map((m) => m.id));

  const fightScenes = person.fightSceneAppearances
    .map((a) => a.fightScene)
    .filter((s) => !s.isDeleted && s.movie);

  const [memberSummaries, editorSummaries, favoriteCounts] = await Promise.all([
    getFightSceneRatingSummaries(fightScenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(fightScenes.map((s) => s.id)),
    getFightSceneFavoriteCounts(fightScenes.map((s) => s.id)),
  ]);

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

  const sortedFightScenes = [...fightScenes].sort(
    (a, b) => (favoriteCounts.get(b.id) ?? 0) - (favoriteCounts.get(a.id) ?? 0),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {person.profilePath && (
            <Image src={tmdbImageUrl(person.profilePath, "w200") ?? ""} alt={person.name} fill sizes="96px" className="object-cover" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{person.name}</h1>
          {bio && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
              {bio.birthday && (
                <span>
                  Born {new Date(bio.birthday).toLocaleDateString(undefined, { dateStyle: "long" })}
                  {bio.deathday && ` — Died ${new Date(bio.deathday).toLocaleDateString(undefined, { dateStyle: "long" })}`}
                </span>
              )}
              {bio.place_of_birth && <span>{bio.place_of_birth}</span>}
            </div>
          )}
          {bio?.biography && (
            <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-neutral-300">{bio.biography}</p>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-xl font-bold text-white">Filmography</h2>
      {movies.length === 0 ? (
        <p className="mb-8 text-sm text-neutral-400">No movies in the catalog yet.</p>
      ) : (
        <div className="mb-10 flex flex-wrap gap-4">
          {movies.map((movie) => {
            const summary = ratingSummaries.get(movie.id);
            return (
              <MovieCard
                key={movie.id}
                movie={{ ...movie, communityAverage: summary?.average ?? null, communityCount: summary?.count ?? 0 }}
              />
            );
          })}
        </div>
      )}

      <h2 className="mb-4 text-xl font-bold text-white">Fight Scenes</h2>
      {sortedFightScenes.length === 0 ? (
        <p className="text-sm text-neutral-400">No fight scenes tagged with this actor yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {sortedFightScenes.map((scene) => {
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
      )}
    </div>
  );
}
