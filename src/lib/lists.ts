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

// Every surface that shows lists to someone other than their owner (browse,
// leaderboard, activity feed, another member's profile, a liker's Liked tab)
// filters on this, so "private" means the same thing everywhere.
export const PUBLIC_LIST_WHERE = { isPrivate: false } as const;

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
  return prisma.memberList.count({ where: { AND: [PUBLIC_LIST_WHERE, NON_EMPTY_WHERE, searchWhere(query)] } });
}

// Cover-collage tiles for a list card: the first few items by when they were
// added, same visibility rules as the list's own page (a pending movie is
// only visible to its submitter; a soft-deleted fight scene shouldn't
// linger just because it was saved before deletion). Shared by /lists and
// the profile Lists tab so both covers are built the same way.
const coverEntriesInclude = {
  entries: {
    where: { movie: { status: "APPROVED" as const } },
    include: { movie: { select: { title: true, posterPath: true, posterOverrideUrl: true } } },
    orderBy: { createdAt: "asc" as const },
    take: LIST_COVER_TILE_LIMIT,
  },
  fightSceneEntries: {
    where: { fightScene: { isDeleted: false } },
    include: { fightScene: { select: { title: true, youtubeVideoId: true } } },
    orderBy: { createdAt: "asc" as const },
    take: LIST_COVER_TILE_LIMIT,
  },
};

function toCoverTiles(list: {
  entries: { movie: { title: string; posterPath: string | null; posterOverrideUrl: string | null } }[];
  fightSceneEntries: { fightScene: { title: string; youtubeVideoId: string } }[];
}): ListCoverTile[] {
  return [
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
}

// One summary card per list on a member's profile Lists tab — a cover, the
// description, and counts, rather than the lists' items themselves. The
// profile used to render up to 12 items per list inline, which grew with
// every list a member made; this is a fixed, small query per list no matter
// how big the lists get. Private lists are included only for the owner.
export async function getMemberListCards(userId: string, includePrivate: boolean) {
  const lists = await prisma.memberList.findMany({
    where: { userId, ...(includePrivate ? {} : PUBLIC_LIST_WHERE) },
    include: {
      ...coverEntriesInclude,
      _count: { select: { entries: true, fightSceneEntries: true, likes: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    isPrivate: list.isPrivate,
    isRanked: list.isRanked,
    updatedAt: list.updatedAt,
    movieCount: list._count.entries,
    fightSceneCount: list._count.fightSceneEntries,
    likeCount: list._count.likes,
    coverTiles: toCoverTiles(list),
  }));
}

export type MemberListCardData = Awaited<ReturnType<typeof getMemberListCards>>[number];

export async function getPublicListsPage(page: number, sort: ListsSort, query: string = "") {
  const lists = await prisma.memberList.findMany({
    where: { AND: [PUBLIC_LIST_WHERE, NON_EMPTY_WHERE, searchWhere(query)] },
    include: {
      user: { select: { username: true } },
      _count: { select: { entries: true, fightSceneEntries: true, likes: true } },
      ...coverEntriesInclude,
    },
    orderBy: sort === "liked" ? { likes: { _count: "desc" } } : { updatedAt: "desc" },
    skip: (page - 1) * LISTS_PAGE_SIZE,
    take: LISTS_PAGE_SIZE,
  });

  return lists.map((list) => {
    const coverTiles = toCoverTiles(list);

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
