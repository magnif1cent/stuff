import { prisma } from "@/lib/prisma";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries } from "@/lib/fight-scenes";
import { FightSceneResultCard } from "@/components/fight-scene-result-card";
import type { Prisma } from "@/generated/prisma/client";

interface FightSceneSearchParams {
  q?: string;
  tag?: string;
  memberRating?: string;
  editorRating?: string;
  sort?: string;
  page?: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "memberRating", label: "Highest Member Rated" },
  { value: "editorRating", label: "Highest Editor Rated" },
] as const;

// Ratings (member and editor) are on a 1-10 scale (see the rating API's score validation).
const MIN_RATING_OPTIONS = [5, 7, 8, 9] as const;

const PAGE_SIZE = 24;

function pageHref(params: FightSceneSearchParams, page: number) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.tag) search.set("tag", params.tag);
  if (params.memberRating) search.set("memberRating", params.memberRating);
  if (params.editorRating) search.set("editorRating", params.editorRating);
  if (params.sort) search.set("sort", params.sort);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/search/fight-scenes?${qs}` : "/search/fight-scenes";
}

export default async function FightSceneSearchPage({
  searchParams,
}: {
  searchParams: Promise<FightSceneSearchParams>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";
  const memberRating = MIN_RATING_OPTIONS.find((r) => String(r) === params.memberRating);
  const editorRating = MIN_RATING_OPTIONS.find((r) => String(r) === params.editorRating);
  const sort = SORT_OPTIONS.some((o) => o.value === params.sort) ? params.sort! : "newest";

  const tags = await prisma.fightSceneTag.findMany({ orderBy: { name: "asc" } });

  const hasFilters = tag.length > 0 || memberRating !== undefined || editorRating !== undefined;
  const searched = query.length > 0 || hasFilters;

  const where: Prisma.FightSceneWhereInput = { isDeleted: false };
  if (tag) where.tags = { some: { name: tag } };
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { movie: { title: { contains: query, mode: "insensitive" } } },
    ];
  }

  const sceneInclude = {
    movie: { select: { id: true, title: true, releaseDate: true } as const },
    tags: true,
  } as const;

  let scenes: Prisma.FightSceneGetPayload<{ include: typeof sceneInclude }>[] = [];
  if (searched) {
    scenes = await prisma.fightScene.findMany({
      where,
      include: sceneInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  const [memberSummaries, editorSummaries] = await Promise.all([
    getFightSceneRatingSummaries(scenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(scenes.map((s) => s.id)),
  ]);

  if (memberRating !== undefined) {
    scenes = scenes.filter((s) => (memberSummaries.get(s.id)?.average ?? 0) >= memberRating);
  }
  if (editorRating !== undefined) {
    scenes = scenes.filter((s) => (editorSummaries.get(s.id)?.average ?? 0) >= editorRating);
  }

  if (sort === "memberRating") {
    scenes = [...scenes].sort(
      (a, b) => (memberSummaries.get(b.id)?.average ?? -1) - (memberSummaries.get(a.id)?.average ?? -1),
    );
  } else if (sort === "editorRating") {
    scenes = [...scenes].sort(
      (a, b) => (editorSummaries.get(b.id)?.average ?? -1) - (editorSummaries.get(a.id)?.average ?? -1),
    );
  }
  // "newest" is already the fetch order (createdAt desc), so no re-sort needed.

  const totalResults = scenes.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pagedScenes = scenes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-serif text-xl font-bold text-white">
        {query ? <>Fight scene results for &ldquo;{query}&rdquo;</> : "Browse fight scenes"}
      </h1>

      <form
        method="get"
        className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-neutral-400">
            Scene or movie title
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={query}
            placeholder="Search…"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tag" className="text-xs text-neutral-400">
            Tag
          </label>
          <select
            id="tag"
            name="tag"
            defaultValue={tag}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="memberRating" className="text-xs text-neutral-400">
            Member rating
          </label>
          <select
            id="memberRating"
            name="memberRating"
            defaultValue={params.memberRating ?? ""}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">Any rating</option>
            {MIN_RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}+
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="editorRating" className="text-xs text-neutral-400">
            Editor rating
          </label>
          <select
            id="editorRating"
            name="editorRating"
            defaultValue={params.editorRating ?? ""}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">Any rating</option>
            {MIN_RATING_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}+
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sort" className="text-xs text-neutral-400">
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600">
          Apply
        </button>
        {searched && (
          <a href="/search/fight-scenes" className="text-sm text-neutral-400 hover:text-white">
            Clear
          </a>
        )}
      </form>

      {!searched ? (
        <p className="text-neutral-400">Enter a scene or movie title, or set a filter, to browse fight scenes.</p>
      ) : totalResults === 0 ? (
        <p className="text-neutral-400">No fight scenes matched your search.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {pagedScenes.map((scene) => {
              const memberSummary = memberSummaries.get(scene.id);
              const editorSummary = editorSummaries.get(scene.id);
              return (
                <FightSceneResultCard
                  key={scene.id}
                  scene={{
                    ...scene,
                    memberRatingAverage: memberSummary?.average ?? null,
                    memberRatingCount: memberSummary?.count ?? 0,
                    editorRatingAverage: editorSummary?.average ?? null,
                    editorRatingCount: editorSummary?.count ?? 0,
                  }}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <a href={pageHref(params, page - 1)} className="text-red-500 hover:underline">
                  ← Previous
                </a>
              ) : (
                <span className="text-neutral-600">← Previous</span>
              )}
              <span className="text-neutral-400">
                Page {page} of {totalPages} ({totalResults} results)
              </span>
              {page < totalPages ? (
                <a href={pageHref(params, page + 1)} className="text-red-500 hover:underline">
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
