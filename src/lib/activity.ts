import { prisma } from "@/lib/prisma";

// Grouped by type rather than one merged/sorted list — a burst of one type
// (e.g. several fight scenes tagged in a row) shouldn't be able to push the
// other two types out of view entirely, the way a flat top-N list allowed.
const PER_TYPE_LIMIT = 3;

interface MoviePoster {
  id: string;
  title: string;
  posterPath: string | null;
  posterOverrideUrl: string | null;
}

export interface FightSceneActivityItem {
  id: string;
  createdAt: Date;
  username: string;
  sceneTitle: string;
  movie: MoviePoster;
}

export interface ListActivityItem {
  id: string;
  createdAt: Date;
  username: string;
  listId: string;
  listName: string;
}

export interface DiscussionActivityItem {
  id: string;
  createdAt: Date;
  username: string;
  excerpt: string;
  movie: MoviePoster;
}

export interface RecentActivity {
  fightScenes: FightSceneActivityItem[];
  lists: ListActivityItem[];
  discussions: DiscussionActivityItem[];
}

const DISCUSSION_EXCERPT_LENGTH = 100;

function excerpt(content: string) {
  if (content.length <= DISCUSSION_EXCERPT_LENGTH) return content;
  return `${content.slice(0, DISCUSSION_EXCERPT_LENGTH).trimEnd()}…`;
}

export async function getRecentActivity(limit = PER_TYPE_LIMIT): Promise<RecentActivity> {
  const moviePosterSelect = { select: { id: true, title: true, posterPath: true, posterOverrideUrl: true } } as const;

  const [fightScenes, lists, discussions] = await Promise.all([
    // Same visibility rule as every other public listing: a fight scene on a
    // still-pending movie stays invisible until the movie is approved.
    prisma.fightScene.findMany({
      where: { isDeleted: false, movie: { status: "APPROVED" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        submittedBy: { select: { username: true } },
        movie: moviePosterSelect,
      },
    }),
    // Lists are public by design from creation, so no extra filtering needed.
    prisma.memberList.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
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
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { username: true } },
        movie: moviePosterSelect,
      },
    }),
  ]);

  return {
    fightScenes: fightScenes.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      username: s.submittedBy.username,
      sceneTitle: s.title,
      movie: s.movie,
    })),
    lists: lists.map((l) => ({
      id: l.id,
      createdAt: l.createdAt,
      username: l.user.username,
      listId: l.id,
      listName: l.name,
    })),
    discussions: discussions.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      username: d.user.username,
      excerpt: excerpt(d.content),
      movie: d.movie,
    })),
  };
}
