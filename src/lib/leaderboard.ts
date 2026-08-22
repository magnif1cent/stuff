import { prisma } from "@/lib/prisma";

const TOP_LISTS_LIMIT = 20;
const TOP_CURATORS_LIMIT = 10;
const TOP_ACTORS_LIMIT = 20;

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
