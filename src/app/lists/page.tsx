import Link from "next/link";
import { getPublicListsCount, getPublicListsPage, LISTS_PAGE_SIZE, type ListsSort } from "@/lib/lists";

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function pageHref(page: number, sort: ListsSort) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (sort !== "newest") params.set("sort", sort);
  const query = params.toString();
  return query ? `/lists?${query}` : "/lists";
}

export default async function BrowseListsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort: ListsSort = params.sort === "liked" ? "liked" : "newest";

  const totalCount = await getPublicListsCount();
  const totalPages = Math.max(1, Math.ceil(totalCount / LISTS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pageLists = await getPublicListsPage(page, sort);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Browse Lists</h1>
          <p className="text-sm text-neutral-400">
            Public lists created by members —{" "}
            <Link href="/leaderboard" className="text-red-500 hover:underline">
              see the leaderboard →
            </Link>
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={pageHref(1, "newest")}
            className={sort === "newest" ? "font-medium text-white" : "text-neutral-400 hover:text-white"}
          >
            Newest
          </Link>
          <span className="text-neutral-700">·</span>
          <Link
            href={pageHref(1, "liked")}
            className={sort === "liked" ? "font-medium text-white" : "text-neutral-400 hover:text-white"}
          >
            Most liked
          </Link>
        </div>
      </div>

      {pageLists.length === 0 ? (
        <p className="text-neutral-400">No public lists yet — create one from a movie&apos;s page.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageLists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.id}`}
                className="rounded-md border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
              >
                <h2 className="font-serif text-lg font-bold text-white">{list.name}</h2>
                <p className="mb-2 text-xs text-neutral-500">
                  by {list.username} · updated {formatDate(list.updatedAt)}
                </p>
                <p className="text-sm text-neutral-300">
                  {list.movieCount} {list.movieCount === 1 ? "movie" : "movies"}
                  {list.fightSceneCount > 0 &&
                    ` · ${list.fightSceneCount} fight ${list.fightSceneCount === 1 ? "scene" : "scenes"}`}
                  {" · "}♥ {list.likeCount}
                </p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1, sort)} className="text-red-500 hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span className="text-neutral-600">← Previous</span>
              )}
              <span className="text-neutral-400">
                Page {page} of {totalPages} ({totalCount} lists)
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1, sort)} className="text-red-500 hover:underline">
                  Next →
                </Link>
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
