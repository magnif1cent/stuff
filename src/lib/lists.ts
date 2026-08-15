import { prisma } from "@/lib/prisma";

export const LISTS_PAGE_SIZE = 12;

export type ListsSort = "newest" | "liked";

// Only lists with at least one item are worth browsing — an empty list is
// still a private-in-practice draft until its owner adds something to it.
// isPublic: true excludes admin-only private lists (see DECISIONS.md).
const NON_EMPTY_WHERE = {
  isPublic: true,
  OR: [{ entries: { some: {} } }, { fightSceneEntries: { some: {} } }],
};

export function getPublicListsCount() {
  return prisma.memberList.count({ where: NON_EMPTY_WHERE });
}

export async function getPublicListsPage(page: number, sort: ListsSort) {
  const lists = await prisma.memberList.findMany({
    where: NON_EMPTY_WHERE,
    include: {
      user: { select: { username: true } },
      _count: { select: { entries: true, fightSceneEntries: true, likes: true } },
    },
    orderBy: sort === "liked" ? { likes: { _count: "desc" } } : { updatedAt: "desc" },
    skip: (page - 1) * LISTS_PAGE_SIZE,
    take: LISTS_PAGE_SIZE,
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    username: list.user.username,
    updatedAt: list.updatedAt,
    movieCount: list._count.entries,
    fightSceneCount: list._count.fightSceneEntries,
    likeCount: list._count.likes,
  }));
}
