import { prisma } from "@/lib/prisma";

const ACTIVITY_FEED_LIMIT = 8;
// Overfetch per event type before merging and sorting, so a burst of one
// type (e.g. several fight scenes tagged in a row) can't crowd out
// still-recent events of another type once everything's combined.
const PER_TYPE_FETCH_LIMIT = 8;

export type ActivityItem =
  | {
      type: "FIGHT_SCENE";
      id: string;
      createdAt: Date;
      username: string;
      movieId: string;
      movieTitle: string;
    }
  | {
      type: "LIST";
      id: string;
      createdAt: Date;
      username: string;
      listId: string;
      listName: string;
    }
  | {
      type: "DISCUSSION";
      id: string;
      createdAt: Date;
      username: string;
      movieId: string;
      movieTitle: string;
    };

export async function getRecentActivity(limit = ACTIVITY_FEED_LIMIT): Promise<ActivityItem[]> {
  const [fightScenes, lists, discussions] = await Promise.all([
    // Same visibility rule as every other public listing: a fight scene on a
    // still-pending movie stays invisible until the movie is approved.
    prisma.fightScene.findMany({
      where: { isDeleted: false, movie: { status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: PER_TYPE_FETCH_LIMIT,
      select: {
        id: true,
        createdAt: true,
        submittedBy: { select: { username: true } },
        movie: { select: { id: true, title: true } },
      },
    }),
    // Lists are public by design from creation, so no extra filtering needed.
    prisma.memberList.findMany({
      orderBy: { createdAt: "desc" },
      take: PER_TYPE_FETCH_LIMIT,
      select: {
        id: true,
        name: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
    // Top-level posts only ("started a discussion") — a reply isn't a new
    // discussion. Same pending-movie visibility rule as fight scenes above.
    prisma.discussionPost.findMany({
      where: { isDeleted: false, parentId: null, movie: { status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: PER_TYPE_FETCH_LIMIT,
      select: {
        id: true,
        createdAt: true,
        user: { select: { username: true } },
        movie: { select: { id: true, title: true } },
      },
    }),
  ]);

  const items: ActivityItem[] = [
    ...fightScenes.map((s) => ({
      type: "FIGHT_SCENE" as const,
      id: s.id,
      createdAt: s.createdAt,
      username: s.submittedBy.username,
      movieId: s.movie.id,
      movieTitle: s.movie.title,
    })),
    ...lists.map((l) => ({
      type: "LIST" as const,
      id: l.id,
      createdAt: l.createdAt,
      username: l.user.username,
      listId: l.id,
      listName: l.name,
    })),
    ...discussions.map((d) => ({
      type: "DISCUSSION" as const,
      id: d.id,
      createdAt: d.createdAt,
      username: d.user.username,
      movieId: d.movie.id,
      movieTitle: d.movie.title,
    })),
  ];

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}
