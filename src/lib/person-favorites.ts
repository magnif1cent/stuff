import { prisma } from "@/lib/prisma";

// Same groupBy-count shape as getFightSceneFavoriteCounts.
export async function getPersonFavoriteCounts(personIds: string[]): Promise<Map<string, number>> {
  if (personIds.length === 0) return new Map();

  const rows = await prisma.personFavorite.groupBy({
    by: ["personId"],
    where: { personId: { in: personIds } },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.personId, row._count._all]));
}
