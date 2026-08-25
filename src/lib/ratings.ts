import { prisma } from "@/lib/prisma";
import { RATING_CATEGORIES, isRatingCategoryKey, type RatingCategoryKey } from "@/lib/rating-categories";

export interface RatingSummary {
  average: number | null;
  count: number;
}

export { RATING_CATEGORIES, isRatingCategoryKey, type RatingCategoryKey };

export type SubcategoryRatingSummaries = Record<RatingCategoryKey, RatingSummary>;

function emptySubcategorySummaries(): SubcategoryRatingSummaries {
  return Object.fromEntries(
    RATING_CATEGORIES.map((c) => [c.key, { average: null, count: 0 }]),
  ) as SubcategoryRatingSummaries;
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

// A collection's own rating: every individual community rating across its
// (approved) movies averaged directly, same weighted approach as
// getTopFranchises in lib/leaderboard.ts -- one query is enough here since
// this is scoped to a single collection, not ranking all of them at once.
export async function getCollectionRatingSummary(collectionTmdbId: number): Promise<RatingSummary> {
  const result = await prisma.rating.aggregate({
    where: { movie: { collectionTmdbId, status: "APPROVED" } },
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

export async function getEditorsRatingSummaries(movieIds: string[]): Promise<Map<string, RatingSummary>> {
  if (movieIds.length === 0) return new Map();

  const rows = await prisma.adminRating.groupBy({
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

export async function getSubcategoryRatingSummary(movieId: string): Promise<SubcategoryRatingSummaries> {
  const rows = await prisma.subcategoryRating.groupBy({
    by: ["category"],
    where: { movieId },
    _avg: { score: true },
    _count: { _all: true },
  });

  const summaries = emptySubcategorySummaries();
  for (const row of rows) {
    if (isRatingCategoryKey(row.category)) {
      summaries[row.category] = { average: row._avg.score, count: row._count._all };
    }
  }
  return summaries;
}

export async function getSubcategoryEditorsRatingSummary(movieId: string): Promise<SubcategoryRatingSummaries> {
  const rows = await prisma.subcategoryAdminRating.groupBy({
    by: ["category"],
    where: { movieId },
    _avg: { score: true },
    _count: { _all: true },
  });

  const summaries = emptySubcategorySummaries();
  for (const row of rows) {
    if (isRatingCategoryKey(row.category)) {
      summaries[row.category] = { average: row._avg.score, count: row._count._all };
    }
  }
  return summaries;
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

  const movies = await prisma.movie.findMany({
    where: { id: { in: ranked.map((r) => r.movieId) }, status: "APPROVED" },
  });
  const byId = new Map(movies.map((m) => [m.id, m]));

  return ranked
    .map((r) => {
      const movie = byId.get(r.movieId);
      if (!movie) return null;
      return { ...movie, communityAverage: r._avg.score, communityCount: r._count._all };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}
