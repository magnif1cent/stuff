import Link from "next/link";
import { getPublicListsCount, getPublicListsPage, LISTS_PAGE_SIZE, type ListsSort } from "@/lib/lists";
import { ListCoverCollage } from "@/components/list-cover-collage";

function pageHref(page: number, sort: ListsSort, q: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (sort !== "newest") params.set("sort", sort);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/lists?${query}` : "/lists";
}

// Same filter-chip look as the fight-scene search page's sort/filter row
// (bubbleClass there) — one shared visual language for "pick one of these"
// controls across the site, rather than this page's own plain-text links.
function pillClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${
    active
      ? "border-red-600 bg-red-950/40 text-red-300"
      : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
  }`;
}

// A small, dense grid card — see "Browse-page redesign" in DECISIONS.md.
// Text is trimmed to just what's needed to tell lists apart at a glance;
// the full byline/date lives on the list's own page, not every card here.
function ListCard({ list }: { list: Awaited<ReturnType<typeof getPublicListsPage>>[number] }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className="group overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 hover:border-neutral-700"
    >
      <ListCoverCollage tiles={list.coverTiles} listName={list.name} />
      <div className="p-2.5">
        <h2 className="truncate text-sm font-semibold text-white group-hover:text-red-500">{list.name}</h2>
        <p className="truncate font-mono text-[11px] text-neutral-500">
          by {list.username} · {list.movieCount + list.fightSceneCount} · ♥ {list.likeCount}
        </p>
      </div>
    </Link>
  );
}

function ListCardGrid({ lists }: { lists: Awaited<ReturnType<typeof getPublicListsPage>> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  );
}

export default async function BrowseListsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const sort: ListsSort = params.sort === "liked" ? "liked" : "newest";
  const q = (params.q ?? "").trim();

  const totalCount = await getPublicListsCount(q);
  const totalPages = Math.max(1, Math.ceil(totalCount / LISTS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pageLists = await getPublicListsPage(page, sort, q);

  // Ranked vs. unranked grouping uses the isRanked flag every list already
  // has — no new taxonomy/schema needed for it. Groups are computed per
  // page (the underlying sort/pagination stays one flat query across both),
  // so a heading only shows when that page actually has a list of that
  // kind, rather than every page repeating both headings regardless.
  const rankedLists = pageLists.filter((list) => list.isRanked);
  const unrankedLists = pageLists.filter((list) => !list.isRanked);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Browse Lists</h1>
          <p className="text-sm text-neutral-400">Public lists created by members</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={pageHref(1, "newest", q)} className={pillClass(sort === "newest")}>
            Newest
          </Link>
          <Link href={pageHref(1, "liked", q)} className={pillClass(sort === "liked")}>
            ♥ Most liked
          </Link>
          <span className="mx-1 self-center text-neutral-700">|</span>
          <Link href="/leaderboard" className={pillClass(false)}>
            Leaderboard →
          </Link>
        </div>
      </div>

      <form method="get" className="mb-6 max-w-xs">
        {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by list name or member…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
      </form>

      {pageLists.length === 0 ? (
        <p className="text-neutral-400">
          {q
            ? <>No lists match &ldquo;{q}&rdquo;.</>
            : "No public lists yet — create one from a movie's page."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {rankedLists.length > 0 && (
              <div>
                <h2 className="mb-3 font-mono text-xs tracking-wide text-neutral-500 uppercase">Ranked</h2>
                <ListCardGrid lists={rankedLists} />
              </div>
            )}
            {unrankedLists.length > 0 && (
              <div>
                {rankedLists.length > 0 && (
                  <h2 className="mb-3 font-mono text-xs tracking-wide text-neutral-500 uppercase">Unranked</h2>
                )}
                <ListCardGrid lists={unrankedLists} />
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(page - 1, sort, q)} className="text-red-500 hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span className="text-neutral-600">← Previous</span>
              )}
              <span className="text-neutral-400">
                Page {page} of {totalPages} ({totalCount} lists)
              </span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1, sort, q)} className="text-red-500 hover:underline">
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
