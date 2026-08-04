import { prisma } from "@/lib/prisma";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries } from "@/lib/fight-scenes";
import { parseRatingFilter } from "@/lib/rating-filter";
import { FightSceneResultCard } from "@/components/fight-scene-result-card";
import { RatingStarInput } from "@/components/rating-star-input";
import { AutocompleteFilterInput } from "@/components/autocomplete-filter-input";
import type { Prisma } from "@/generated/prisma/client";

interface FightSceneSearchParams {
  q?: string;
  tag?: string | string[];
  actor?: string;
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

const PAGE_SIZE = 24;

function pageHref(params: FightSceneSearchParams, page: number) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  for (const t of Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []) {
    search.append("tag", t);
  }
  if (params.actor) search.set("actor", params.actor);
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
  const selectedTags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : [];
  const actor = params.actor?.trim() ?? "";
  const memberRating = parseRatingFilter(params.memberRating);
  const editorRating = parseRatingFilter(params.editorRating);
  const sort = SORT_OPTIONS.some((o) => o.value === params.sort) ? params.sort! : "newest";

  const tags = await prisma.fightSceneTag.findMany({ orderBy: { name: "asc" } });

  const hasFilters = selectedTags.length > 0 || actor.length > 0 || memberRating !== undefined || editorRating !== undefined;
  const searched = query.length > 0 || hasFilters;

  const where: Prisma.FightSceneWhereInput = { isDeleted: false };
  // Checking multiple tags is a broadening OR ("has any of these"), matching
  // the standard convention for multi-select within a single filter facet.
  if (selectedTags.length > 0) where.tags = { some: { name: { in: selectedTags } } };
  if (actor) where.cast = { some: { person: { name: { contains: actor, mode: "insensitive" } } } };
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row">
      <form
        method="get"
        className="flex w-full shrink-0 flex-col gap-4 rounded-md border border-neutral-800 bg-neutral-900 p-4 sm:w-64"
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
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-400">Tags (any of)</p>
          <div className="flex flex-wrap gap-2 rounded-md border border-neutral-700 bg-neutral-950 p-2">
            {tags.length === 0 && <span className="text-sm text-neutral-500">No tags yet</span>}
            {tags.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-300 has-checked:border-red-600 has-checked:bg-red-950/40 has-checked:text-red-300"
              >
                <input
                  type="checkbox"
                  name="tag"
                  value={t.name}
                  defaultChecked={selectedTags.includes(t.name)}
                  className="sr-only"
                />
                {t.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="actor" className="text-xs text-neutral-400">
            Actor
          </label>
          <AutocompleteFilterInput
            id="actor"
            name="actor"
            initialValue={actor}
            endpoint="/api/fight-scene-actors"
            resultsKey="actors"
            placeholder="Any actor"
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-400">Member rating (min.)</p>
          <RatingStarInput name="memberRating" initialValue={params.memberRating ?? ""} />
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-400">Editor rating (min.)</p>
          <RatingStarInput name="editorRating" initialValue={params.editorRating ?? ""} />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="sort" className="text-xs text-neutral-400">
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600">
            Apply
          </button>
          {searched && (
            <a href="/search/fight-scenes" className="text-sm text-neutral-400 hover:text-white">
              Clear
            </a>
          )}
        </div>
      </form>

      <div className="min-w-0 flex-1">
        <h1 className="mb-6 font-serif text-xl font-bold text-white">
          {query ? <>Fight scene results for &ldquo;{query}&rdquo;</> : "Browse fight scenes"}
        </h1>

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
    </div>
  );
}
