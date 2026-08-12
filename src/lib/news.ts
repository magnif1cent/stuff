import { prisma } from "@/lib/prisma";

export const MAX_NEWS_TITLE_LENGTH = 200;
export const MAX_NEWS_CONTENT_LENGTH = 10000;

export const NEWS_ARCHIVE_PAGE_SIZE = 10;

// Latest post only, for the homepage teaser banner — separate from the
// paginated archive query below since it only ever needs the newest row.
export async function getLatestNewsPost() {
  return prisma.newsPost.findFirst({ orderBy: { createdAt: "desc" } });
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
