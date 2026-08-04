import { prisma } from "@/lib/prisma";

export const DISCUSSION_PAGE_SIZE = 20;
export const MAX_REPLIES_PER_POST = 100;
export const MAX_DISCUSSION_CONTENT_LENGTH = 5000;

export async function getDiscussionPage(movieId: string, cursor?: string | null) {
  const posts = await prisma.discussionPost.findMany({
    where: { movieId, parentId: null },
    orderBy: { createdAt: "desc" },
    take: DISCUSSION_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        take: MAX_REPLIES_PER_POST,
        include: { user: { select: { username: true, image: true } } },
      },
    },
  });

  const hasMore = posts.length > DISCUSSION_PAGE_SIZE;
  const page = hasMore ? posts.slice(0, DISCUSSION_PAGE_SIZE) : posts;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return { posts: page, nextCursor };
}
