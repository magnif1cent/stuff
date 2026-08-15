import { prisma } from "@/lib/prisma";

export const MAX_CATEGORY_NAME_LENGTH = 60;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 200;
export const MAX_THREAD_TITLE_LENGTH = 150;
export const MAX_FORUM_POST_LENGTH = 5000;

export const FORUM_THREAD_PAGE_SIZE = 20;
export const FORUM_POST_PAGE_SIZE = 20;
export const MAX_REPLIES_PER_POST = 100;

// Admin-entered category name -> URL slug (lowercase letters/numbers,
// hyphen-separated) for the /forum/[category] route.
export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getForumThreadPage(categoryId: string, page: number) {
  const [threads, totalCount] = await Promise.all([
    prisma.forumThread.findMany({
      where: { categoryId, isDeleted: false },
      // Pinned threads always sort first, newest activity within each group.
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * FORUM_THREAD_PAGE_SIZE,
      take: FORUM_THREAD_PAGE_SIZE,
      include: {
        author: { select: { username: true } },
        _count: { select: { posts: { where: { isDeleted: false } } } },
      },
    }),
    prisma.forumThread.count({ where: { categoryId, isDeleted: false } }),
  ]);
  return { threads, totalCount };
}

// Mirrors getDiscussionPage in src/lib/discussion.ts: cursor-paginated
// top-level posts with one level of replies eagerly included.
export async function getForumPostPage(threadId: string, cursor?: string | null) {
  const posts = await prisma.forumPost.findMany({
    where: { threadId, parentId: null },
    orderBy: { createdAt: "asc" },
    take: FORUM_POST_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { username: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        take: MAX_REPLIES_PER_POST,
        include: { author: { select: { username: true, image: true } } },
      },
    },
  });

  const hasMore = posts.length > FORUM_POST_PAGE_SIZE;
  const page = hasMore ? posts.slice(0, FORUM_POST_PAGE_SIZE) : posts;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return { posts: page, nextCursor };
}
