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

const TOP_RATED_MIN_RATINGS = 2;

export async function getTopRatedMovies(limit = 12) {
  const grouped = await prisma.rating.groupBy({
    by: ["movieId"],
    _avg: { score: true },
    _count: { _all: true },
  });

  const ranked = grouped
    .filter((row) => row._count._all >= TOP_RATED_MIN_RATINGS)
    .sort((a, b) => (b._avg.score ?? 0) - (a._avg.score ?? 0))
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const movies = await prisma.movie.findMany({ where: { id: { in: ranked.map((r) => r.movieId) } } });
  const byId = new Map(movies.map((m) => [m.id, m]));

  return ranked
    .map((r) => {
      const movie = byId.get(r.movieId);
      if (!movie) return null;
      return { ...movie, communityAverage: r._avg.score, communityCount: r._count._all };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}
