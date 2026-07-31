import { prisma } from "@/lib/prisma";

const FEATURED_COUNT = 5;

function startOfWeek(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d;
}

export async function computeWeeklyFeatured() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStart = startOfWeek(now);

  const [ratingCounts, discussionCounts] = await Promise.all([
    prisma.rating.groupBy({
      by: ["movieId"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.discussionPost.groupBy({
      by: ["movieId"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
  ]);

  const activity = new Map<string, number>();
  for (const row of ratingCounts) {
    activity.set(row.movieId, (activity.get(row.movieId) ?? 0) + row._count._all);
  }
  for (const row of discussionCounts) {
    activity.set(row.movieId, (activity.get(row.movieId) ?? 0) + row._count._all);
  }

  let topMovieIds = [...activity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, FEATURED_COUNT)
    .map(([movieId]) => movieId);

  if (topMovieIds.length < FEATURED_COUNT) {
    const fallback = await prisma.movie.findMany({
      where: { id: { notIn: topMovieIds } },
      orderBy: { tmdbPopularity: "desc" },
      take: FEATURED_COUNT - topMovieIds.length,
      select: { id: true },
    });
    topMovieIds = [...topMovieIds, ...fallback.map((m) => m.id)];
  }

  await prisma.weeklyFeatured.deleteMany({ where: { weekStart } });
  await prisma.weeklyFeatured.createMany({
    data: topMovieIds.map((movieId, index) => ({
      movieId,
      rank: index + 1,
      weekStart,
    })),
  });

  return { weekStart, movieIds: topMovieIds };
}

export async function getFeaturedMovies() {
  const latest = await prisma.weeklyFeatured.findFirst({ orderBy: { weekStart: "desc" } });

  if (latest) {
    const entries = await prisma.weeklyFeatured.findMany({
      where: { weekStart: latest.weekStart },
      orderBy: { rank: "asc" },
      include: { movie: true },
    });
    if (entries.length > 0) {
      return entries.map((e) => e.movie);
    }
  }

  return prisma.movie.findMany({
    orderBy: { tmdbPopularity: "desc" },
    take: FEATURED_COUNT,
  });
}
