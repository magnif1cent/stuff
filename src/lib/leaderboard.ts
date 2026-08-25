import { prisma } from "@/lib/prisma";

const TOP_LISTS_LIMIT = 20;
const TOP_CURATORS_LIMIT = 10;
const TOP_ACTORS_LIMIT = 20;
const TOP_FRANCHISES_LIMIT = 10;
// A single-movie "collection" isn't a franchise to rank against others.
export const MIN_FRANCHISE_MOVIES = 2;

export async function getMostLikedLists() {
  const lists = await prisma.memberList.findMany({
    where: { entries: { some: {} } },
    include: {
      user: { select: { username: true } },
      _count: { select: { likes: true, entries: true } },
    },
    orderBy: { likes: { _count: "desc" } },
    take: TOP_LISTS_LIMIT,
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    username: list.user.username,
    likeCount: list._count.likes,
    movieCount: list._count.entries,
  }));
}

// No SQL-level aggregate for "total movies across a user's lists" (it spans
// two joins), so this ranks in memory — fine at this app's scale, same
// tradeoff already made for fight-scene search sorting.
export async function getTopCurators() {
  const users = await prisma.user.findMany({
    where: { memberLists: { some: {} } },
    select: {
      username: true,
      memberLists: { select: { _count: { select: { entries: true } } } },
    },
  });

  return users
    .map((user) => ({
      username: user.username,
      listCount: user.memberLists.length,
      movieCount: user.memberLists.reduce((sum, list) => sum + list._count.entries, 0),
    }))
    .filter((user) => user.movieCount > 0)
    .sort((a, b) => b.movieCount - a.movieCount)
    .slice(0, TOP_CURATORS_LIMIT);
}

// Same shape as getMostLikedLists -- ranks Person rows by PersonFavorite
// count via the relation's _count, one query, no in-memory aggregation
// needed (unlike getTopCurators, this doesn't span two joins).
export async function getMostBelovedActors() {
  const people = await prisma.person.findMany({
    where: { favorites: { some: {} } },
    select: {
      id: true,
      name: true,
      profilePath: true,
      _count: { select: { favorites: true } },
    },
    orderBy: { favorites: { _count: "desc" } },
    take: TOP_ACTORS_LIMIT,
  });

  return people.map((person) => ({
    id: person.id,
    name: person.name,
    profilePath: person.profilePath,
    favoriteCount: person._count.favorites,
  }));
}

// Ranks TMDB collections ("franchises") by the average of every individual
// community rating across all their (approved) movies -- a straight
// weighted average, each rating counted once, not each movie's own average
// counted once. Deliberately the simple version: no Bayesian shrinkage
// toward a global mean (the way IMDb's public weighted-rating formula
// does), which would better damp a low-vote outlier further -- ship this,
// revisit the formula once there's a real sense of how it behaves on the
// actual catalog. See DECISIONS.md for the weighted-vs-unweighted reasoning.
//
// Two queries total regardless of collection count (same "rank in memory"
// tradeoff already made in getTopCurators above) rather than one aggregate
// per collection -- Prisma's groupBy can't group Rating rows by a joined
// Movie field directly.
export async function getTopFranchises() {
  const movies = await prisma.movie.findMany({
    where: { status: "APPROVED", collectionTmdbId: { not: null } },
    select: { id: true, collectionTmdbId: true, collectionName: true },
  });

  const byCollection = new Map<number, { collectionName: string; movieIds: string[] }>();
  for (const movie of movies) {
    const collectionTmdbId = movie.collectionTmdbId!;
    const existing = byCollection.get(collectionTmdbId);
    if (existing) {
      existing.movieIds.push(movie.id);
    } else {
      byCollection.set(collectionTmdbId, { collectionName: movie.collectionName!, movieIds: [movie.id] });
    }
  }

  const qualifying = [...byCollection.entries()].filter(
    ([, { movieIds }]) => movieIds.length >= MIN_FRANCHISE_MOVIES,
  );
  if (qualifying.length === 0) return [];

  const movieToCollection = new Map<string, number>();
  for (const [collectionTmdbId, { movieIds }] of qualifying) {
    for (const movieId of movieIds) movieToCollection.set(movieId, collectionTmdbId);
  }

  const ratings = await prisma.rating.findMany({
    where: { movieId: { in: [...movieToCollection.keys()] } },
    select: { movieId: true, score: true },
  });

  const sums = new Map<number, { total: number; count: number }>();
  for (const rating of ratings) {
    const collectionTmdbId = movieToCollection.get(rating.movieId)!;
    const sum = sums.get(collectionTmdbId) ?? { total: 0, count: 0 };
    sum.total += rating.score;
    sum.count += 1;
    sums.set(collectionTmdbId, sum);
  }

  return qualifying
    .map(([collectionTmdbId, { collectionName, movieIds }]) => {
      const sum = sums.get(collectionTmdbId);
      return {
        collectionTmdbId,
        collectionName,
        movieCount: movieIds.length,
        ratingAverage: sum ? sum.total / sum.count : null,
        ratingCount: sum?.count ?? 0,
      };
    })
    .filter((franchise): franchise is typeof franchise & { ratingAverage: number } => franchise.ratingAverage !== null)
    .sort((a, b) => b.ratingAverage - a.ratingAverage)
    .slice(0, TOP_FRANCHISES_LIMIT);
}
