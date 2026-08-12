import { prisma } from "@/lib/prisma";

export interface MovieRecommender {
  id: string;
  username: string;
}

export async function getMovieRecommendationsByMovieIds(
  movieIds: string[],
): Promise<Map<string, MovieRecommender[]>> {
  if (movieIds.length === 0) return new Map();

  const rows = await prisma.movieRecommendation.findMany({
    where: { movieId: { in: movieIds } },
    orderBy: { createdAt: "asc" },
    include: { admin: { select: { id: true, username: true } } },
  });

  const map = new Map<string, MovieRecommender[]>();
  for (const row of rows) {
    const list = map.get(row.movieId) ?? [];
    list.push(row.admin);
    map.set(row.movieId, list);
  }
  return map;
}

export async function getMovieRecommenders(movieId: string): Promise<MovieRecommender[]> {
  const rows = await prisma.movieRecommendation.findMany({
    where: { movieId },
    orderBy: { createdAt: "asc" },
    include: { admin: { select: { id: true, username: true } } },
  });
  return rows.map((row) => row.admin);
}
