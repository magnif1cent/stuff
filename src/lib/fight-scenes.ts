import { prisma } from "@/lib/prisma";
import { parseYoutubeUrl } from "@/lib/youtube";

export const MAX_FIGHT_SCENE_CAST = 20;
export const MAX_FIGHT_SCENE_TAGS = 10;
export const MAX_FIGHT_SCENE_TITLE_LENGTH = 200;

export interface FightSceneRatingSummary {
  average: number | null;
  count: number;
}

const fightSceneInclude = {
  submittedBy: { select: { name: true, image: true } },
  cast: {
    orderBy: { order: "asc" as const },
    include: { person: true },
  },
  tags: true,
};

export async function getFightScenesForMovie(movieId: string) {
  return prisma.fightScene.findMany({
    where: { movieId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: fightSceneInclude,
  });
}

export async function getFightSceneById(movieId: string, fightSceneId: string) {
  const scene = await prisma.fightScene.findUnique({
    where: { id: fightSceneId },
    include: { ...fightSceneInclude, movie: { select: { id: true, title: true } } },
  });
  if (!scene || scene.movieId !== movieId || scene.isDeleted) return null;
  return scene;
}

export function getFightSceneTags() {
  return prisma.fightSceneTag.findMany({ orderBy: { name: "asc" } });
}

export async function getFightSceneRatingSummaries(
  fightSceneIds: string[],
): Promise<Map<string, FightSceneRatingSummary>> {
  if (fightSceneIds.length === 0) return new Map();

  const rows = await prisma.fightSceneRating.groupBy({
    by: ["fightSceneId"],
    where: { fightSceneId: { in: fightSceneIds } },
    _avg: { score: true },
    _count: { _all: true },
  });

  const map = new Map<string, FightSceneRatingSummary>();
  for (const row of rows) {
    map.set(row.fightSceneId, { average: row._avg.score, count: row._count._all });
  }
  return map;
}

export async function getFightSceneAdminRatingSummaries(
  fightSceneIds: string[],
): Promise<Map<string, FightSceneRatingSummary>> {
  if (fightSceneIds.length === 0) return new Map();

  const rows = await prisma.fightSceneAdminRating.groupBy({
    by: ["fightSceneId"],
    where: { fightSceneId: { in: fightSceneIds } },
    _avg: { score: true },
    _count: { _all: true },
  });

  const map = new Map<string, FightSceneRatingSummary>();
  for (const row of rows) {
    map.set(row.fightSceneId, { average: row._avg.score, count: row._count._all });
  }
  return map;
}

interface ValidatedFightSceneInput {
  title: string;
  videoId: string;
  startSeconds: number | null;
  personIds: string[];
  tagIds: string[];
}

// Shared by the create and edit routes: parses/validates title, YouTube link,
// actors (must be in the movie's cast), and tags (must exist) from a raw
// request body. Returns either the validated fields or a {error, status} to
// send straight back to the client.
export async function parseAndValidateFightSceneInput(
  movieId: string,
  body: unknown,
): Promise<ValidatedFightSceneInput | { error: string; status: number }> {
  const { title, youtubeUrl, personIds, tagIds } = (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "title is required.", status: 400 };
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length > MAX_FIGHT_SCENE_TITLE_LENGTH) {
    return { error: `title must be ${MAX_FIGHT_SCENE_TITLE_LENGTH} characters or fewer.`, status: 400 };
  }

  if (typeof youtubeUrl !== "string" || youtubeUrl.trim().length === 0) {
    return { error: "youtubeUrl is required.", status: 400 };
  }
  const parsed = parseYoutubeUrl(youtubeUrl.trim());
  if (!parsed) {
    return { error: "That doesn't look like a valid YouTube link.", status: 400 };
  }

  if (!Array.isArray(personIds) || personIds.length === 0 || !personIds.every((p) => typeof p === "string")) {
    return { error: "personIds must be a non-empty array of actor ids.", status: 400 };
  }
  const uniquePersonIds = [...new Set(personIds)];
  if (uniquePersonIds.length > MAX_FIGHT_SCENE_CAST) {
    return { error: `A fight scene can list at most ${MAX_FIGHT_SCENE_CAST} actors.`, status: 400 };
  }
  // Actors must already be part of this movie's cast, so members can't tag
  // someone who was never in the film.
  const castCount = await prisma.castCredit.count({ where: { movieId, personId: { in: uniquePersonIds } } });
  if (castCount !== uniquePersonIds.length) {
    return { error: "All actors must be part of this movie's cast.", status: 400 };
  }

  const rawTagIds = tagIds ?? [];
  if (!Array.isArray(rawTagIds) || !rawTagIds.every((t) => typeof t === "string")) {
    return { error: "tagIds must be an array of tag ids.", status: 400 };
  }
  const uniqueTagIds = [...new Set(rawTagIds)];
  if (uniqueTagIds.length > MAX_FIGHT_SCENE_TAGS) {
    return { error: `A fight scene can have at most ${MAX_FIGHT_SCENE_TAGS} tags.`, status: 400 };
  }
  if (uniqueTagIds.length > 0) {
    const tagCount = await prisma.fightSceneTag.count({ where: { id: { in: uniqueTagIds } } });
    if (tagCount !== uniqueTagIds.length) {
      return { error: "One or more tags don't exist.", status: 400 };
    }
  }

  return {
    title: trimmedTitle,
    videoId: parsed.videoId,
    startSeconds: parsed.startSeconds,
    personIds: uniquePersonIds,
    tagIds: uniqueTagIds,
  };
}
