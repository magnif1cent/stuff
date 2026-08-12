import { prisma } from "@/lib/prisma";

export const MAX_NEWS_TITLE_LENGTH = 200;
export const MAX_NEWS_CONTENT_LENGTH = 10000;

// Matches Recent Reviews by Editors' scale for a consistent homepage
// rhythm — flat, no pagination, since the full paginated history lives on
// the /news archive page instead.
export const NEWS_HOMEPAGE_COUNT = 5;
export const NEWS_ARCHIVE_PAGE_SIZE = 10;

export async function getRecentNewsPosts(limit = NEWS_HOMEPAGE_COUNT) {
  return prisma.newsPost.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { username: true } } },
  });
}

export async function getNewsArchivePage(page: number) {
  const [posts, totalCount] = await Promise.all([
    prisma.newsPost.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * NEWS_ARCHIVE_PAGE_SIZE,
      take: NEWS_ARCHIVE_PAGE_SIZE,
      include: { author: { select: { username: true } } },
    }),
    prisma.newsPost.count(),
  ]);
  return { posts, totalCount };
}
