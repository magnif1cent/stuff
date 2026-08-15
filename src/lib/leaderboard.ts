import { prisma } from "@/lib/prisma";

const TOP_LISTS_LIMIT = 20;
const TOP_CURATORS_LIMIT = 10;

export async function getMostLikedLists() {
  const lists = await prisma.memberList.findMany({
    where: { isPublic: true, entries: { some: {} } },
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
// tradeoff already made for fight-scene search sorting. Only public lists
// count, both for who qualifies at all and for the movie total itself --
// otherwise an admin's private lists would inflate a public ranking with
// numbers nobody could actually browse to verify (see DECISIONS.md).
export async function getTopCurators() {
  const users = await prisma.user.findMany({
    where: { memberLists: { some: { isPublic: true } } },
    select: {
      username: true,
      memberLists: { where: { isPublic: true }, select: { _count: { select: { entries: true } } } },
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
