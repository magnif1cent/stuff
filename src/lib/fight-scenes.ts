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
  submittedBy: { select: { username: true, image: true } },
  cast: {
    orderBy: { order: "asc" as const },
    include: { person: true },
  },
  tags: true,
};

export async function getFightScenesForMovie(movieId: string, options?: { limit?: number }) {
  // Ascending so scenes render Round 1, 2, 3… left to right — matches
  // getFightSceneRoundNumbers' own ordering below. With a limit (the movie
  // page's teaser), that ordering would just return the *oldest* scenes, the
  // opposite of the "newest first" the teaser wants — so a limited fetch
  // takes the newest N by querying descending, then reverses back to
  // ascending for display.
  if (options?.limit) {
    const scenes = await prisma.fightScene.findMany({
      where: { movieId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: options.limit,
      include: fightSceneInclude,
    });
    return scenes.reverse();
  }
  return prisma.fightScene.findMany({
    where: { movieId, isDeleted: false },
    orderBy: { createdAt: "asc" },
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

// "Round No." is a movie-scoped position, not a stored value — the 1st fight
// scene ever added to a movie is Round 1, the 5th is Round 5, and if one gets
// deleted the rest shift down automatically since this is recomputed from
// whichever rows currently survive, ordered by creation time.
export async function getFightSceneRoundNumbers(movieId: string): Promise<Map<string, number>> {
  const scenes = await prisma.fightScene.findMany({
    where: { movieId, isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const map = new Map<string, number>();
  scenes.forEach((scene, index) => map.set(scene.id, index + 1));
  return map;
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

export async function getFightSceneFavoriteCounts(fightSceneIds: string[]): Promise<Map<string, number>> {
  if (fightSceneIds.length === 0) return new Map();

  const rows = await prisma.fightSceneFavorite.groupBy({
    by: ["fightSceneId"],
    where: { fightSceneId: { in: fightSceneIds } },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.fightSceneId, row._count._all]));
}

// Picks one verified fight scene per movie to preview as a hero clip:
// highest member rating, falling back to editor rating, falling back to
// whichever was tagged first (stable rather than random across page loads).
// Unverified scenes are excluded — the same bar members already have to
// clear for a scene to show a "verified" badge elsewhere in the app.
export async function getFeaturedFightSceneClips(
  movieIds: string[],
): Promise<Map<string, { youtubeVideoId: string; youtubeStartSeconds: number | null }>> {
  if (movieIds.length === 0) return new Map();

  const scenes = await prisma.fightScene.findMany({
    where: { movieId: { in: movieIds }, isVerified: true, isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, movieId: true, youtubeVideoId: true, youtubeStartSeconds: true },
  });

  const [memberSummaries, editorSummaries] = await Promise.all([
    getFightSceneRatingSummaries(scenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(scenes.map((s) => s.id)),
  ]);

  const bestByMovie = new Map<string, { score: number; scene: (typeof scenes)[number] }>();
  for (const scene of scenes) {
    const score = memberSummaries.get(scene.id)?.average ?? editorSummaries.get(scene.id)?.average ?? -1;
    const current = bestByMovie.get(scene.movieId);
    if (!current || score > current.score) {
      bestByMovie.set(scene.movieId, { score, scene });
    }
  }

  const result = new Map<string, { youtubeVideoId: string; youtubeStartSeconds: number | null }>();
  for (const [movieId, { scene }] of bestByMovie) {
    result.set(movieId, { youtubeVideoId: scene.youtubeVideoId, youtubeStartSeconds: scene.youtubeStartSeconds });
  }
  return result;
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
