import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const CO_STAR_WEIGHT = 3;
const SHARED_TAG_WEIGHT = 2;
const MAX_RESULTS = 8;

export interface SimilarActor {
  id: string;
  name: string;
  profilePath: string | null;
}

// Actor-to-actor counterpart of getSimilarMovies (src/lib/similar-movies.ts) --
// same blend-signals-then-score-in-JS approach, adapted to the two
// person-level signals this catalog actually has: co-starring in the same
// APPROVED movie, and sharing a fight-scene tag. Co-starring counts as the
// stronger signal since it's a direct, personal connection; a shared tag
// (e.g. "Weapons") is a looser genre-style signal shared by many actors.
export async function getSimilarActors(person: { id: string }): Promise<SimilarActor[]> {
  const [movieRows, tagRows] = await Promise.all([
    prisma.castCredit.findMany({
      where: { personId: person.id, movie: { status: "APPROVED" } },
      select: { movieId: true },
    }),
    prisma.fightSceneCast.findMany({
      where: { personId: person.id, fightScene: { isDeleted: false } },
      select: { fightScene: { select: { tags: { select: { id: true } } } } },
    }),
  ]);

  const movieIds = movieRows.map((c) => c.movieId);
  const tagIds = [...new Set(tagRows.flatMap((r) => r.fightScene.tags.map((t) => t.id)))];

  const orConditions: Prisma.PersonWhereInput[] = [];
  if (movieIds.length > 0) orConditions.push({ castCredits: { some: { movieId: { in: movieIds } } } });
  if (tagIds.length > 0) {
    orConditions.push({
      fightSceneAppearances: {
        some: { fightScene: { isDeleted: false, tags: { some: { id: { in: tagIds } } } } },
      },
    });
  }

  if (orConditions.length === 0) return [];

  const candidates = await prisma.person.findMany({
    where: { id: { not: person.id }, OR: orConditions },
    select: {
      id: true,
      name: true,
      profilePath: true,
      castCredits: { select: { movieId: true } },
      fightSceneAppearances: {
        where: { fightScene: { isDeleted: false } },
        select: { fightScene: { select: { tags: { select: { id: true } } } } },
      },
    },
  });

  const movieIdSet = new Set(movieIds);
  const tagIdSet = new Set(tagIds);

  const scored = candidates.map((candidate) => {
    const sharedMovies = candidate.castCredits.filter((c) => movieIdSet.has(c.movieId)).length;
    const candidateTagIds = new Set(
      candidate.fightSceneAppearances.flatMap((a) => a.fightScene.tags.map((t) => t.id)),
    );
    const sharedTags = [...candidateTagIds].filter((id) => tagIdSet.has(id)).length;
    const score = sharedMovies * CO_STAR_WEIGHT + sharedTags * SHARED_TAG_WEIGHT;
    return { candidate, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => ({ id: s.candidate.id, name: s.candidate.name, profilePath: s.candidate.profilePath }));
}
