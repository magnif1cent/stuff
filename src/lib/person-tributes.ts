import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// Same cap as MAX_MEMBER_REVIEW_LENGTH -- a full writeup, not a trivia
// snippet.
export const MAX_PERSON_TRIBUTE_LENGTH = 5000;

// How many tributes show inline on the actor page itself before linking out
// to the full paginated list, same reasoning as MEMBER_REVIEWS_PREVIEW_COUNT.
export const PERSON_TRIBUTES_PREVIEW_COUNT = 2;

export const PERSON_TRIBUTES_PAGE_SIZE = 10;

const personTributeOrderBy: Prisma.PersonTributeOrderByWithRelationInput[] = [
  { voteScore: "desc" },
  { createdAt: "desc" },
];

export function getTopPersonTributes(personId: string, limit: number = PERSON_TRIBUTES_PREVIEW_COUNT) {
  return prisma.personTribute.findMany({
    where: { personId },
    orderBy: personTributeOrderBy,
    take: limit,
    include: { author: { select: { username: true } } },
  });
}

export function getPersonTributesCount(personId: string) {
  return prisma.personTribute.count({ where: { personId } });
}

export async function getPersonTributesPage(personId: string, page: number) {
  const [tributes, totalCount] = await Promise.all([
    prisma.personTribute.findMany({
      where: { personId },
      orderBy: personTributeOrderBy,
      skip: (page - 1) * PERSON_TRIBUTES_PAGE_SIZE,
      take: PERSON_TRIBUTES_PAGE_SIZE,
      include: { author: { select: { username: true } } },
    }),
    getPersonTributesCount(personId),
  ]);
  return { tributes, totalCount };
}

export interface PersonTributeVoteSummary {
  up: number;
  down: number;
}

export async function getPersonTributeVoteSummaries(
  tributeIds: string[],
): Promise<Map<string, PersonTributeVoteSummary>> {
  if (tributeIds.length === 0) return new Map();

  const rows = await prisma.personTributeVote.groupBy({
    by: ["tributeId", "value"],
    where: { tributeId: { in: tributeIds } },
    _count: { _all: true },
  });

  const map = new Map<string, PersonTributeVoteSummary>();
  for (const row of rows) {
    const summary = map.get(row.tributeId) ?? { up: 0, down: 0 };
    if (row.value === 1) summary.up = row._count._all;
    else if (row.value === -1) summary.down = row._count._all;
    map.set(row.tributeId, summary);
  }
  return map;
}
