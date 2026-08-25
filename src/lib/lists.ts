import { prisma } from "@/lib/prisma";

// Smaller, denser cards (see the browse-page redesign decision in
// DECISIONS.md) fit more per row, so a page holds more than the old
// large-card layout's 12.
export const LISTS_PAGE_SIZE = 24;

// How many poster/thumbnail tiles the browse-card cover collage shows.
export const LIST_COVER_TILE_LIMIT = 4;

export type ListsSort = "newest" | "liked";

export type ListCoverTile =
  | { kind: "MOVIE"; title: string; posterPath: string | null; posterOverrideUrl: string | null }
  | { kind: "FIGHT_SCENE"; title: string; youtubeVideoId: string };

// Only lists with at least one item are worth browsing — an empty list is
// still a private-in-practice draft until its owner adds something to it.
const NON_EMPTY_WHERE = {
  OR: [{ entries: { some: {} } }, { fightSceneEntries: { some: {} } }],
};

// Matches by list name or owner username — one search box covering both,
// same "one input, multiple fields" idiom as the navbar's movie/actor
// search. `contains`+`insensitive` compiles to an ILIKE substring match,
// backed by the trigram GIN indexes on MemberList.name and User.username
// (see the migration and the schema comments on those indexes) so this
// stays an index scan rather than a full-table scan as the list count grows.
function searchWhere(query: string) {
  const q = query.trim();
  if (!q) return {};
  return {
    OR: [{ name: { contains: q, mode: "insensitive" as const } }, { user: { username: { contains: q, mode: "insensitive" as const } } }],
  };
}

export function getPublicListsCount(query: string = "") {
  return prisma.memberList.count({ where: { AND: [NON_EMPTY_WHERE, searchWhere(query)] } });
}

export async function getPublicListsPage(page: number, sort: ListsSort, query: string = "") {
  const lists = await prisma.memberList.findMany({
    where: { AND: [NON_EMPTY_WHERE, searchWhere(query)] },
    include: {
      user: { select: { username: true } },
      _count: { select: { entries: true, fightSceneEntries: true, likes: true } },
      // Same visibility rules as the list's own page: a pending movie is only
      // visible to its submitter, and a soft-deleted fight scene shouldn't
      // linger just because it was saved before deletion. Ordered oldest
      // first so the cover reflects the list's original core, not whatever
      // was tacked on most recently.
      entries: {
        where: { movie: { status: "APPROVED" } },
        include: { movie: { select: { title: true, posterPath: true, posterOverrideUrl: true } } },
        orderBy: { createdAt: "asc" },
        take: LIST_COVER_TILE_LIMIT,
      },
      fightSceneEntries: {
        where: { fightScene: { isDeleted: false } },
        include: { fightScene: { select: { title: true, youtubeVideoId: true } } },
        orderBy: { createdAt: "asc" },
        take: LIST_COVER_TILE_LIMIT,
      },
    },
    orderBy: sort === "liked" ? { likes: { _count: "desc" } } : { updatedAt: "desc" },
    skip: (page - 1) * LISTS_PAGE_SIZE,
    take: LISTS_PAGE_SIZE,
  });

  return lists.map((list) => {
    const coverTiles: ListCoverTile[] = [
      ...list.entries.map((entry): ListCoverTile => ({
        kind: "MOVIE",
        title: entry.movie.title,
        posterPath: entry.movie.posterPath,
        posterOverrideUrl: entry.movie.posterOverrideUrl,
      })),
      ...list.fightSceneEntries.map((entry): ListCoverTile => ({
        kind: "FIGHT_SCENE",
        title: entry.fightScene.title,
        youtubeVideoId: entry.fightScene.youtubeVideoId,
      })),
    ].slice(0, LIST_COVER_TILE_LIMIT);

    return {
      id: list.id,
      name: list.name,
      username: list.user.username,
      updatedAt: list.updatedAt,
      isRanked: list.isRanked,
      movieCount: list._count.entries,
      fightSceneCount: list._count.fightSceneEntries,
      likeCount: list._count.likes,
      coverTiles,
    };
  });
}
