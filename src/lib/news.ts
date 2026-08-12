import { prisma } from "@/lib/prisma";

export const NEWS_PAGE_SIZE = 10;
export const MAX_NEWS_TITLE_LENGTH = 200;
export const MAX_NEWS_CONTENT_LENGTH = 10000;

export async function getNewsPostsPage(page: number) {
  const [posts, totalCount] = await Promise.all([
    prisma.newsPost.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * NEWS_PAGE_SIZE,
      take: NEWS_PAGE_SIZE,
      include: { author: { select: { username: true } } },
    }),
    prisma.newsPost.count(),
  ]);
  return { posts, totalCount };
}

// Latest post only, for the homepage teaser — separate from the paginated
// query above since it only ever needs the single newest row.
export async function getLatestNewsPost() {
  return prisma.newsPost.findFirst({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  });
}
