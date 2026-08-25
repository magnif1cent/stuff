// Split out from lib/member-lists.ts (plain constants, safe for client
// components to import) because this touches prisma — bundling it into that
// file pulled the `pg` driver into the browser bundle for any client
// component that only wanted the constants.
import { prisma } from "@/lib/prisma";

// The next position at the end of a list's unified ranking — one counter
// shared across MemberListEntry.rank and MemberListFightSceneEntry.rank
// (see the schema comment on either) so a movie and a fight scene added
// back-to-back still land in append order relative to each other, not just
// within their own table.
export async function getNextListRank(listId: string): Promise<number> {
  const [maxMovieRank, maxFightSceneRank] = await Promise.all([
    prisma.memberListEntry.aggregate({ where: { listId }, _max: { rank: true } }),
    prisma.memberListFightSceneEntry.aggregate({ where: { listId }, _max: { rank: true } }),
  ]);
  const highest = Math.max(maxMovieRank._max.rank ?? 0, maxFightSceneRank._max.rank ?? 0);
  return highest + 1;
}

// Movies and fight scenes combined, for enforcing MAX_ITEMS_PER_LIST before
// a new entry is created.
export async function getListItemCount(listId: string): Promise<number> {
  const [movieCount, fightSceneCount] = await Promise.all([
    prisma.memberListEntry.count({ where: { listId } }),
    prisma.memberListFightSceneEntry.count({ where: { listId } }),
  ]);
  return movieCount + fightSceneCount;
}
