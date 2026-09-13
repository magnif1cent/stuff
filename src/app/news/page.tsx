import { prisma } from "@/lib/prisma";
import { getNewsArchivePage, NEWS_ARCHIVE_PAGE_SIZE } from "@/lib/news";
import { NewsList, type NewsPostItem } from "@/components/news-list";
import { Pagination } from "@/components/pagination";

function pageHref(page: number) {
  return page > 1 ? `/news?page=${page}` : "/news";
}

export default async function NewsArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const totalCount = await prisma.newsPost.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / NEWS_ARCHIVE_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);

  const { posts } = await getNewsArchivePage(page);
  const items: NewsPostItem[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    author: post.author,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 font-serif text-2xl font-bold text-white">News &amp; Updates Archive</h1>

      {items.length === 0 ? (
        <p className="text-neutral-400">No posts yet — check back soon.</p>
      ) : (
        <>
          <NewsList posts={items} />

          <Pagination page={page} totalPages={totalPages} buildHref={pageHref} label={`${totalCount} posts`} />
        </>
      )}
    </div>
  );
}
