import { prisma } from "@/lib/prisma";

// Short trivia snippet, not a discussion post — capped well below
// MAX_DISCUSSION_CONTENT_LENGTH (5000) to keep entries scannable, matching
// the length of a typical IMDB "Did you know" item.
export const MAX_FUN_FACT_LENGTH = 500;

export function getFunFactsForMovie(movieId: string) {
  return prisma.funFact.findMany({
    where: { movieId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: { submittedBy: { select: { username: true } } },
  });
}

export interface FunFactVoteSummary {
  up: number;
  down: number;
}

// No SQL-level up-minus-down aggregate spanning the group-by result, so the
// net score used for sorting is computed in memory from these counts — same
// tradeoff already made for Top Curators and fuzzy-search ranking.
export async function getFunFactVoteSummaries(factIds: string[]): Promise<Map<string, FunFactVoteSummary>> {
  if (factIds.length === 0) return new Map();

  const rows = await prisma.funFactVote.groupBy({
    by: ["factId", "value"],
    where: { factId: { in: factIds } },
    _count: { _all: true },
  });

  const map = new Map<string, FunFactVoteSummary>();
  for (const row of rows) {
    const summary = map.get(row.factId) ?? { up: 0, down: 0 };
    if (row.value === 1) summary.up = row._count._all;
    else if (row.value === -1) summary.down = row._count._all;
    map.set(row.factId, summary);
  }
  return map;
}
