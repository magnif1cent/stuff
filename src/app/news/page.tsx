import { prisma } from "@/lib/prisma";
import { getNewsPostsPage, NEWS_PAGE_SIZE } from "@/lib/news";
import { NewsList, type NewsPostItem } from "@/components/news-list";

function pageHref(page: number) {
  return page > 1 ? `/news?page=${page}` : "/news";
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const totalCount = await prisma.newsPost.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / NEWS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);

  const { posts } = await getNewsPostsPage(page);
  const items: NewsPostItem[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-white">News &amp; Updates</h1>

      {items.length === 0 ? (
        <p className="text-neutral-400">No posts yet — check back soon.</p>
      ) : (
        <>
          <NewsList posts={items} />

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <a href={pageHref(page - 1)} className="text-red-500 hover:underline">
                  ← Previous
                </a>
              ) : (
                <span className="text-neutral-600">← Previous</span>
              )}
              <span className="text-neutral-400">
                Page {page} of {totalPages} ({totalCount} posts)
              </span>
              {page < totalPages ? (
                <a href={pageHref(page + 1)} className="text-red-500 hover:underline">
                  Next →
                </a>
              ) : (
                <span className="text-neutral-600">Next →</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
