import { prisma } from "@/lib/prisma";

// Same cap as movie Fun Facts (MAX_FUN_FACT_LENGTH in fun-facts.ts) -- a
// trivia snippet about the actor, not a full writeup.
export const MAX_PERSON_FUN_FACT_LENGTH = 500;

export function getFunFactsForPerson(personId: string) {
  return prisma.personFunFact.findMany({
    where: { personId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: { submittedBy: { select: { username: true } } },
  });
}

export interface PersonFunFactVoteSummary {
  up: number;
  down: number;
}

// Same in-memory groupBy tradeoff as getFunFactVoteSummaries -- no SQL-level
// up-minus-down aggregate, and actor fun facts aren't paginated at the DB
// level either.
export async function getPersonFunFactVoteSummaries(
  factIds: string[],
): Promise<Map<string, PersonFunFactVoteSummary>> {
  if (factIds.length === 0) return new Map();

  const rows = await prisma.personFunFactVote.groupBy({
    by: ["factId", "value"],
    where: { factId: { in: factIds } },
    _count: { _all: true },
  });

  const map = new Map<string, PersonFunFactVoteSummary>();
  for (const row of rows) {
    const summary = map.get(row.factId) ?? { up: 0, down: 0 };
    if (row.value === 1) summary.up = row._count._all;
    else if (row.value === -1) summary.down = row._count._all;
    map.set(row.factId, summary);
  }
  return map;
}
