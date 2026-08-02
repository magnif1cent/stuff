import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { findSimilarMovies } from "@/lib/fuzzy-search";
import { MovieCard } from "@/components/movie-card";
import type { Movie, Prisma } from "@/generated/prisma/client";

interface SearchPageParams {
  q?: string;
  genre?: string;
  director?: string;
  country?: string;
  minRating?: string;
  yearFrom?: string;
  yearTo?: string;
  sort?: string;
  page?: string;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

// Community ratings are on a 1-10 scale (see the rating API's score validation).
const MIN_RATING_OPTIONS = [5, 7, 8, 9] as const;

const PAGE_SIZE = 24;

function buildFilterWhere(genre: string, director: string, country: string, yearFrom?: number, yearTo?: number) {
  const where: Prisma.MovieWhereInput = {};
  if (genre) where.genres = { some: { name: genre } };
  if (director) where.director = director;
  if (country) where.country = country;
  if (yearFrom || yearTo) {
    where.releaseDate = {
      ...(yearFrom ? { gte: new Date(Date.UTC(yearFrom, 0, 1)) } : {}),
      ...(yearTo ? { lt: new Date(Date.UTC(yearTo + 1, 0, 1)) } : {}),
    };
  }
  return where;
}

function pageHref(params: SearchPageParams, page: number) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.genre) search.set("genre", params.genre);
  if (params.director) search.set("director", params.director);
  if (params.country) search.set("country", params.country);
  if (params.minRating) search.set("minRating", params.minRating);
  if (params.yearFrom) search.set("yearFrom", params.yearFrom);
  if (params.yearTo) search.set("yearTo", params.yearTo);
  if (params.sort) search.set("sort", params.sort);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/search?${qs}` : "/search";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const genre = params.genre?.trim() ?? "";
  const director = params.director?.trim() ?? "";
  const country = params.country?.trim() ?? "";
  const minRating = MIN_RATING_OPTIONS.find((r) => String(r) === params.minRating);
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : undefined;
  const yearTo = params.yearTo ? Number(params.yearTo) : undefined;
  const sort = SORT_OPTIONS.some((o) => o.value === params.sort) ? params.sort! : "relevance";

  const [genres, directorRows, countryRows] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.movie.findMany({
      where: { director: { not: null } },
      distinct: ["director"],
      orderBy: { director: "asc" },
      select: { director: true },
    }),
    prisma.movie.findMany({
      where: { country: { not: null } },
      distinct: ["country"],
      orderBy: { country: "asc" },
      select: { country: true },
    }),
  ]);
  const directors = directorRows.map((m) => m.director!).filter(Boolean);
  const countries = countryRows.map((m) => m.country!).filter(Boolean);

  const filterWhere = buildFilterWhere(genre, director, country, yearFrom, yearTo);
  const hasFilters = Object.keys(filterWhere).length > 0 || minRating !== undefined;

  let results: Movie[] = [];
  let usedFuzzyFallback = false;

  if (query) {
    const [titleMatches, castMatches, directorMatches] = await Promise.all([
      prisma.movie.findMany({ where: { AND: [{ title: { contains: query, mode: "insensitive" } }, filterWhere] } }),
      prisma.movie.findMany({
        where: { AND: [{ cast: { some: { person: { name: { contains: query, mode: "insensitive" } } } } }, filterWhere] },
      }),
      prisma.movie.findMany({ where: { AND: [{ director: { contains: query, mode: "insensitive" } }, filterWhere] } }),
    ]);
    const byId = new Map(titleMatches.map((m) => [m.id, m]));
    for (const movie of [...castMatches, ...directorMatches]) {
      if (!byId.has(movie.id)) byId.set(movie.id, movie);
    }
    results = [...byId.values()];

    // Typo-tolerant fallback only when nothing at all matched and no other
    // filters are active — with filters set, silently ignoring them to
    // show fuzzy matches would be more confusing than a plain "no results".
    if (results.length === 0 && !hasFilters) {
      results = await findSimilarMovies(query);
      usedFuzzyFallback = results.length > 0;
    }
  } else if (hasFilters) {
    results = await prisma.movie.findMany({ where: filterWhere, orderBy: { releaseDate: "desc" } });
  }

  const ratingSummaries = await getRatingSummaries(results.map((m) => m.id));

  if (minRating !== undefined) {
    results = results.filter((m) => (ratingSummaries.get(m.id)?.average ?? 0) >= minRating);
  }

  if (sort === "rating") {
    results = [...results].sort(
      (a, b) => (ratingSummaries.get(b.id)?.average ?? -1) - (ratingSummaries.get(a.id)?.average ?? -1),
    );
  } else if (sort === "newest") {
    results = [...results].sort((a, b) => (b.releaseDate?.getTime() ?? 0) - (a.releaseDate?.getTime() ?? 0));
  } else if (sort === "oldest") {
    results = [...results].sort(
      (a, b) => (a.releaseDate?.getTime() ?? Infinity) - (b.releaseDate?.getTime() ?? Infinity),
    );
  }

  const searched = query.length > 0 || hasFilters;
  const totalResults = results.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pagedResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 font-serif text-xl font-bold text-white">
        {query ? <>Search results for &ldquo;{query}&rdquo;</> : "Browse movies"}
      </h1>

      <form method="get" className="mb-8 flex flex-wrap items-end gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-neutral-400">
            Title or actor
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
          <label htmlFor="genre" className="text-xs text-neutral-400">
            Genre
          </label>
          <select
            id="genre"
            name="genre"
            defaultValue={genre}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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
          <label htmlFor="director" className="text-xs text-neutral-400">
            Director
          </label>
          <select
            id="director"
            name="director"
            defaultValue={director}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="">All directors</option>
            {directors.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="country" className="text-xs text-neutral-400">
            Country
          </label>
          <select
            id="country"
            name="country"
            defaultValue={country}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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
          <label htmlFor="minRating" className="text-xs text-neutral-400">
            Min. rating
          </label>
          <select
            id="minRating"
            name="minRating"
            defaultValue={params.minRating ?? ""}
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
          <label htmlFor="yearFrom" className="text-xs text-neutral-400">
            Year from
          </label>
          <input
            id="yearFrom"
            name="yearFrom"
            type="number"
            defaultValue={params.yearFrom ?? ""}
            placeholder="1970"
            className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="yearTo" className="text-xs text-neutral-400">
            Year to
          </label>
          <input
            id="yearTo"
            name="yearTo"
            type="number"
            defaultValue={params.yearTo ?? ""}
            placeholder="2025"
            className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
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
        {(query || hasFilters) && (
          <a href="/search" className="text-sm text-neutral-400 hover:text-white">
            Clear
          </a>
        )}
      </form>

      {!searched ? (
        <p className="text-neutral-400">Enter a movie title or actor name, or set a filter, to browse the catalog.</p>
      ) : totalResults === 0 ? (
        <p className="text-neutral-400">No movies matched your search.</p>
      ) : (
        <>
          {usedFuzzyFallback && (
            <p className="mb-4 text-sm text-neutral-400">
              No exact matches for &ldquo;{query}&rdquo; — showing similar titles instead.
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            {pagedResults.map((movie) => {
              const summary = ratingSummaries.get(movie.id);
              return (
                <MovieCard
                  key={movie.id}
                  movie={{
                    ...movie,
                    communityAverage: summary?.average ?? null,
                    communityCount: summary?.count ?? 0,
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
