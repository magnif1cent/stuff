import { prisma } from "@/lib/prisma";

export const MAX_FIGHT_SCENE_CAST = 20;

export interface FightSceneRatingSummary {
  average: number | null;
  count: number;
}

export async function getFightScenesForMovie(movieId: string) {
  return prisma.fightScene.findMany({
    where: { movieId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true, image: true } },
      cast: {
        orderBy: { order: "asc" },
        include: { person: true },
      },
    },
  });
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
