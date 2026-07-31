import { prisma } from "@/lib/prisma";

export interface RatingSummary {
  average: number | null;
  count: number;
}

export async function getRatingSummaries(movieIds: string[]): Promise<Map<string, RatingSummary>> {
  if (movieIds.length === 0) return new Map();

  const rows = await prisma.rating.groupBy({
    by: ["movieId"],
    where: { movieId: { in: movieIds } },
    _avg: { score: true },
    _count: { _all: true },
  });

  const map = new Map<string, RatingSummary>();
  for (const row of rows) {
    map.set(row.movieId, { average: row._avg.score, count: row._count._all });
  }
  return map;
}

export async function getCommunityRatingSummary(movieId: string): Promise<RatingSummary> {
  const result = await prisma.rating.aggregate({
    where: { movieId },
    _avg: { score: true },
    _count: { _all: true },
  });
  return { average: result._avg.score, count: result._count._all };
}

export async function getEditorsRatingSummary(movieId: string): Promise<RatingSummary> {
  const result = await prisma.adminRating.aggregate({
    where: { movieId },
    _avg: { score: true },
    _count: { _all: true },
  });
  return { average: result._avg.score, count: result._count._all };
}
