import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries, getFightSceneFavoriteCounts } from "@/lib/fight-scenes";
import { parseRatingFilter } from "@/lib/rating-filter";
import { FightSceneResultCard } from "@/components/fight-scene-result-card";
import { RatingStarInput } from "@/components/rating-star-input";
import { AutocompleteFilterInput } from "@/components/autocomplete-filter-input";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

interface FightSceneSearchParams {
  q?: string;
  tag?: string | string[];
  actor?: string;
  genre?: string;
  country?: string;
  memberRating?: string;
  editorRating?: string;
  yearFrom?: string;
  yearTo?: string;
  verified?: string;
  favorites?: string;
  sort?: string;
  page?: string;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "memberRating", label: "Highest Member Rated" },
  { value: "editorRating", label: "Highest Editor Rated" },
  { value: "mostFavorited", label: "Most Favorited" },
] as const;

// Quick-access shortcuts into the movie year range, filtering on the same
// yearFrom/yearTo the sidebar form already supports.
const ERA_OPTIONS = [
  { label: "70s Era", yearFrom: 1970, yearTo: 1979 },
  { label: "80s Era", yearFrom: 1980, yearTo: 1989 },
  { label: "90s Era", yearFrom: 1990, yearTo: 1999 },
  { label: "2000s Era", yearFrom: 2000, yearTo: 2009 },
] as const;

const PAGE_SIZE = 24;

function bubbleClass(active: boolean) {
  return `rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap ${
    active
      ? "border-red-600 bg-red-950/40 text-red-300"
      : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
  }`;
}

function pageHref(params: FightSceneSearchParams, page: number) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  for (const t of Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : []) {
    search.append("tag", t);
  }
  if (params.actor) search.set("actor", params.actor);
  if (params.genre) search.set("genre", params.genre);
  if (params.country) search.set("country", params.country);
  if (params.memberRating) search.set("memberRating", params.memberRating);
  if (params.editorRating) search.set("editorRating", params.editorRating);
  if (params.yearFrom) search.set("yearFrom", params.yearFrom);
  if (params.yearTo) search.set("yearTo", params.yearTo);
  if (params.verified) search.set("verified", params.verified);
  if (params.favorites) search.set("favorites", params.favorites);
  if (params.sort) search.set("sort", params.sort);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/search/fights?${qs}` : "/search/fights";
}

export default async function FightSceneSearchPage({
  searchParams,
}: {
  searchParams: Promise<FightSceneSearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const query = params.q?.trim() ?? "";
  const selectedTags = Array.isArray(params.tag) ? params.tag : params.tag ? [params.tag] : [];
  const actor = params.actor?.trim() ?? "";
  const genre = params.genre?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const memberRating = parseRatingFilter(params.memberRating);
  const editorRating = parseRatingFilter(params.editorRating);
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : undefined;
  const yearTo = params.yearTo ? Number(params.yearTo) : undefined;
  const verifiedOnly = params.verified === "1";
  const userId = session?.user?.id;
  const favoritesOnly = params.favorites === "1" && !!userId;
  const sort = SORT_OPTIONS.some((o) => o.value === params.sort) ? params.sort! : "newest";

  const [tags, genres, countryRows] = await Promise.all([
    prisma.fightSceneTag.findMany({ orderBy: { name: "asc" } }),
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.movie.findMany({
      where: { country: { not: null }, status: "APPROVED" },
      distinct: ["country"],
      orderBy: { country: "asc" },
      select: { country: true },
    }),
  ]);
  const countries = countryRows.map((m) => m.country!).filter(Boolean);

  const hasFilters =
    selectedTags.length > 0 ||
    actor.length > 0 ||
    genre.length > 0 ||
    country.length > 0 ||
    memberRating !== undefined ||
    editorRating !== undefined ||
    yearFrom !== undefined ||
    yearTo !== undefined ||
    verifiedOnly ||
    favoritesOnly;
  const searched = query.length > 0 || hasFilters;

  const where: Prisma.FightSceneWhereInput = { isDeleted: false };
  // Checking multiple tags is a broadening OR ("has any of these"), matching
  // the standard convention for multi-select within a single filter facet.
  if (selectedTags.length > 0) where.tags = { some: { name: { in: selectedTags } } };
  if (actor) where.cast = { some: { person: { name: { contains: actor, mode: "insensitive" } } } };
  // Filters by the *movie's* release year/genre/country, not the scene's own
  // fields — these are all facets of the film the fight happened in, same as
  // /search (movies) already filters on, so they share a single `where.movie`.
  if (genre || country || yearFrom || yearTo) {
    where.movie = {
      ...(genre ? { genres: { some: { name: genre } } } : {}),
      ...(country ? { country } : {}),
      ...(yearFrom || yearTo
        ? {
            releaseDate: {
              ...(yearFrom ? { gte: new Date(Date.UTC(yearFrom, 0, 1)) } : {}),
              ...(yearTo ? { lt: new Date(Date.UTC(yearTo + 1, 0, 1)) } : {}),
            },
          }
        : {}),
    };
  }
  if (verifiedOnly) where.isVerified = true;
  if (favoritesOnly && userId) where.favorites = { some: { userId } };
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { movie: { title: { contains: query, mode: "insensitive" } } },
    ];
  }

  const sceneInclude = {
    movie: { select: { id: true, title: true, releaseDate: true } as const },
    tags: true,
    cast: { orderBy: { order: "asc" as const }, include: { person: true } },
  } as const;

  // Unlike the old behavior (nothing shown until a query/filter was set),
  // this always fetches — "Browse Fights" is the page's default state,
  // not just its title, matching how the movie catalog's homepage rails work.
  let scenes = await prisma.fightScene.findMany({
    where,
    include: sceneInclude,
    orderBy: { createdAt: "desc" },
  });

  const [memberSummaries, editorSummaries, favoriteCounts] = await Promise.all([
    getFightSceneRatingSummaries(scenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(scenes.map((s) => s.id)),
    getFightSceneFavoriteCounts(scenes.map((s) => s.id)),
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
  } else if (sort === "mostFavorited") {
    scenes = [...scenes].sort((a, b) => (favoriteCounts.get(b.id) ?? 0) - (favoriteCounts.get(a.id) ?? 0));
  }
  // "newest" is already the fetch order (createdAt desc), so no re-sort needed.

  const totalResults = scenes.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pagedScenes = scenes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const myMemberLists = session?.user
    ? await prisma.memberList.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          fightSceneEntries: { where: { fightSceneId: { in: pagedScenes.map((s) => s.id) } }, select: { fightSceneId: true } },
        },
      })
    : [];
  const myMemberListItems = myMemberLists.map((list) => ({ id: list.id, name: list.name }));

  const myFightSceneFavorites = session?.user
    ? await prisma.fightSceneFavorite.findMany({
        where: { userId: session.user.id, fightSceneId: { in: pagedScenes.map((s) => s.id) } },
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row">
      {/* On mobile, the sidebar naturally stacks above the results in DOM
          order -- but this form has ten-odd fields, so a visitor would have
          to scroll past all of them before reaching a single result or even
          the quick-filter bubbles. `order` flips it below the results on
          mobile without touching the side-by-side desktop layout, which
          already reads left-to-right filters-then-results just fine. */}
      <form
        method="get"
        className="order-2 flex w-full shrink-0 flex-col gap-4 rounded-md border border-neutral-800 bg-neutral-900 p-4 sm:order-1 sm:w-64"
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
          <label htmlFor="genre" className="text-xs text-neutral-400">
            Movie genre
          </label>
          <select
            id="genre"
            name="genre"
            defaultValue={genre}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="country" className="text-xs text-neutral-400">
            Movie country
          </label>
          <select
            id="country"
            name="country"
            defaultValue={country}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-400">Movie year range</p>
          <div className="flex gap-2">
            <input
              name="yearFrom"
              type="number"
              aria-label="Year from"
              defaultValue={params.yearFrom ?? ""}
              placeholder="1970"
              className="w-1/2 min-w-0 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            />
            <input
              name="yearTo"
              type="number"
              aria-label="Year to"
              defaultValue={params.yearTo ?? ""}
              placeholder="2025"
              className="w-1/2 min-w-0 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            />
          </div>
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
            <a href="/search/fights" className="text-sm text-neutral-400 hover:text-white">
              Clear
            </a>
          )}
        </div>
      </form>

      <div className="order-1 min-w-0 flex-1 sm:order-2">
        <h1 className="mb-4 font-serif text-xl font-bold text-white">
          {query ? <>Fights matching &ldquo;{query}&rdquo;</> : "Browse Fights"}
        </h1>

        {/* Quick-access shortcuts into a filtered/sorted view — a faster
            path than the sidebar form for the handful of values (a sort
            order, an era) that don't need free-text input. Each bubble is
            a standalone view rather than a composable filter (clicking one
            replaces the whole query instead of layering onto whatever's
            already selected), so an already-active bubble toggles back to
            the plain, unfiltered page instead of just reapplying itself.
            Tags aren't repeated here since the sidebar's own Tags
            checkboxes already cover that filter. The actor filter is
            otherwise sidebar-only since it's open-ended text, not a fixed
            set of values a bubble row can represent -- Jackie Chan gets a
            named exception as the one actor prominent enough on this site
            to warrant his own one-click shortcut. */}
        <div className="mb-6 flex flex-wrap gap-2">
          <a
            href={sort === "memberRating" ? "/search/fights" : "/search/fights?sort=memberRating"}
            className={bubbleClass(sort === "memberRating")}
          >
            ★ Top Rated
          </a>
          <a
            href={sort === "mostFavorited" ? "/search/fights" : "/search/fights?sort=mostFavorited"}
            className={bubbleClass(sort === "mostFavorited")}
          >
            ♥ Most Favorited
          </a>
          <a href={verifiedOnly ? "/search/fights" : "/search/fights?verified=1"} className={bubbleClass(verifiedOnly)}>
            ✓ Verified only
          </a>
          {session?.user && (
            <a href={favoritesOnly ? "/search/fights" : "/search/fights?favorites=1"} className={bubbleClass(favoritesOnly)}>
              ♥ My Favorites
            </a>
          )}
          <a
            href={actor === "Jackie Chan" ? "/search/fights" : "/search/fights?actor=Jackie+Chan"}
            className={bubbleClass(actor === "Jackie Chan")}
          >
            Jackie Chan
          </a>
          {ERA_OPTIONS.map((era) => {
            const active = yearFrom === era.yearFrom && yearTo === era.yearTo;
            return (
              <a
                key={era.label}
                href={active ? "/search/fights" : `/search/fights?yearFrom=${era.yearFrom}&yearTo=${era.yearTo}`}
                className={bubbleClass(active)}
              >
                {era.label}
              </a>
            );
          })}
          {/* Sits right next to the bubbles it clears -- the sidebar form's
              own Clear link (further down, next to Apply) resets the exact
              same query but isn't visible from up here, so an active bubble
              had no obvious way to turn itself back off. */}
          {(searched || sort !== "newest") && (
            <a href="/search/fights" className="self-center text-sm text-neutral-400 hover:text-white">
              Clear
            </a>
          )}
        </div>

        {totalResults === 0 ? (
          <p className="text-neutral-400">
            {searched ? "No fight scenes matched your search." : "No fight scenes have been added yet."}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4">
              {pagedScenes.map((scene) => {
                const memberSummary = memberSummaries.get(scene.id);
                const editorSummary = editorSummaries.get(scene.id);
                const initialLists = myMemberListItems.map((list) => {
                  const listRow = myMemberLists.find((l) => l.id === list.id)!;
                  return { ...list, hasItem: listRow.fightSceneEntries.some((e) => e.fightSceneId === scene.id) };
                });
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
                    initialLists={initialLists}
                    signedIn={!!session?.user}
                    initialFavorite={myFightSceneFavorites.some((e) => e.fightSceneId === scene.id)}
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
