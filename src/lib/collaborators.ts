import { prisma } from "@/lib/prisma";

const MAX_COLLABORATORS = 8;

export interface Collaborator {
  id: string;
  name: string;
  profilePath: string | null;
  sharedMovieCount: number;
  sharedFightSceneCount: number;
}

// Ranked by shared movies first, not a blended score -- this app avoids
// composite/weighted stats elsewhere (e.g. the unweighted Community Rating,
// see DECISIONS.md), so two independent counts stay independent instead of
// collapsing into one opaque number a visitor can't audit. Shared fight
// scenes is the tiebreaker, then name for stable ordering. Unlike the old
// single "Sparring Partner" card, there's no minimum-count threshold here:
// naming one person as *the* partner off a single coincidence was
// misleading, but a ranked top-N list carries no such claim -- it's fine
// for an actor with a small filmography to show a collaborator with just
// one shared movie.
export async function getTopCollaborators(
  personId: string,
  movieIds: string[],
  fightSceneIds: string[],
): Promise<Collaborator[]> {
  const [castRows, fightRows] = await Promise.all([
    movieIds.length > 0
      ? prisma.castCredit.findMany({
          where: { movieId: { in: movieIds }, personId: { not: personId } },
          select: { movieId: true, personId: true, person: { select: { name: true, profilePath: true } } },
        })
      : Promise.resolve([]),
    fightSceneIds.length > 0
      ? prisma.fightSceneCast.findMany({
          where: { fightSceneId: { in: fightSceneIds }, personId: { not: personId } },
          select: { fightSceneId: true, personId: true, person: { select: { name: true, profilePath: true } } },
        })
      : Promise.resolve([]),
  ]);

  const movieCounts = new Map<string, { name: string; profilePath: string | null; movieIds: Set<string> }>();
  for (const row of castRows) {
    const entry = movieCounts.get(row.personId) ?? {
      name: row.person.name,
      profilePath: row.person.profilePath,
      movieIds: new Set<string>(),
    };
    entry.movieIds.add(row.movieId);
    movieCounts.set(row.personId, entry);
  }

  const fightCounts = new Map<string, { name: string; profilePath: string | null; fightSceneIds: Set<string> }>();
  for (const row of fightRows) {
    const entry = fightCounts.get(row.personId) ?? {
      name: row.person.name,
      profilePath: row.person.profilePath,
      fightSceneIds: new Set<string>(),
    };
    entry.fightSceneIds.add(row.fightSceneId);
    fightCounts.set(row.personId, entry);
  }

  const allIds = new Set([...movieCounts.keys(), ...fightCounts.keys()]);
  const collaborators: Collaborator[] = [...allIds].map((id) => {
    const movieEntry = movieCounts.get(id);
    const fightEntry = fightCounts.get(id);
    return {
      id,
      name: (movieEntry ?? fightEntry)!.name,
      profilePath: (movieEntry ?? fightEntry)!.profilePath,
      sharedMovieCount: movieEntry?.movieIds.size ?? 0,
      sharedFightSceneCount: fightEntry?.fightSceneIds.size ?? 0,
    };
  });

  return collaborators
    .sort(
      (a, b) =>
        b.sharedMovieCount - a.sharedMovieCount ||
        b.sharedFightSceneCount - a.sharedFightSceneCount ||
        a.name.localeCompare(b.name),
    )
    .slice(0, MAX_COLLABORATORS);
}

export interface SharedMovie {
  id: string;
  title: string;
  releaseDate: Date | null;
  posterPath: string | null;
  posterOverrideUrl: string | null;
  characterNameA: string | null;
  characterNameB: string | null;
}

export interface SharedFightScene {
  id: string;
  title: string;
  movieId: string;
  movieTitle: string;
}

// Everything two actors share, for the pairwise "with" page -- a fresh pair
// of queries rather than data already loaded elsewhere, since the two
// actors here are arbitrary (not necessarily the page's own subject).
export async function getSharedCollaborations(
  personIdA: string,
  personIdB: string,
): Promise<{ movies: SharedMovie[]; fightScenes: SharedFightScene[] }> {
  const [creditsA, creditsB, castRowsA, castRowsB] = await Promise.all([
    prisma.castCredit.findMany({
      where: { personId: personIdA, movie: { status: "APPROVED" } },
      select: {
        movieId: true,
        characterName: true,
        movie: { select: { id: true, title: true, releaseDate: true, posterPath: true, posterOverrideUrl: true } },
      },
    }),
    prisma.castCredit.findMany({
      where: { personId: personIdB, movie: { status: "APPROVED" } },
      select: { movieId: true, characterName: true },
    }),
    prisma.fightSceneCast.findMany({
      where: { personId: personIdA, fightScene: { isDeleted: false } },
      select: {
        fightSceneId: true,
        fightScene: { select: { id: true, title: true, movieId: true, movie: { select: { title: true } } } },
      },
    }),
    prisma.fightSceneCast.findMany({
      where: { personId: personIdB, fightScene: { isDeleted: false } },
      select: { fightSceneId: true },
    }),
  ]);

  const characterNameByMovieB = new Map(creditsB.map((c) => [c.movieId, c.characterName]));
  const movies: SharedMovie[] = creditsA
    .filter((c) => characterNameByMovieB.has(c.movieId))
    .map((c) => ({
      ...c.movie,
      characterNameA: c.characterName,
      characterNameB: characterNameByMovieB.get(c.movieId) ?? null,
    }))
    .sort((a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0));

  const fightSceneIdsB = new Set(castRowsB.map((r) => r.fightSceneId));
  const fightScenes: SharedFightScene[] = castRowsA
    .filter((r) => fightSceneIdsB.has(r.fightSceneId))
    .map((r) => ({
      id: r.fightScene.id,
      title: r.fightScene.title,
      movieId: r.fightScene.movieId,
      movieTitle: r.fightScene.movie.title,
    }));

  return { movies, fightScenes };
}
