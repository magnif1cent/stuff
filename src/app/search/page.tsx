import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";
import type { Movie, Prisma } from "@/generated/prisma/client";

interface SearchPageParams {
  q?: string;
  genre?: string;
  director?: string;
  yearFrom?: string;
  yearTo?: string;
  sort?: string;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Highest Rated" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

function buildFilterWhere(genre: string, director: string, yearFrom?: number, yearTo?: number) {
  const where: Prisma.MovieWhereInput = {};
  if (genre) where.genres = { some: { name: genre } };
  if (director) where.director = director;
  if (yearFrom || yearTo) {
    where.releaseDate = {
      ...(yearFrom ? { gte: new Date(Date.UTC(yearFrom, 0, 1)) } : {}),
      ...(yearTo ? { lt: new Date(Date.UTC(yearTo + 1, 0, 1)) } : {}),
    };
  }
  return where;
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
  const yearFrom = params.yearFrom ? Number(params.yearFrom) : undefined;
  const yearTo = params.yearTo ? Number(params.yearTo) : undefined;
  const sort = SORT_OPTIONS.some((o) => o.value === params.sort) ? params.sort! : "relevance";

  const [genres, directorRows] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.movie.findMany({
      where: { director: { not: null } },
      distinct: ["director"],
      orderBy: { director: "asc" },
      select: { director: true },
    }),
  ]);
  const directors = directorRows.map((m) => m.director!).filter(Boolean);

  const filterWhere = buildFilterWhere(genre, director, yearFrom, yearTo);
  const hasFilters = Object.keys(filterWhere).length > 0;

  let results: Movie[] = [];
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
  } else if (hasFilters) {
    results = await prisma.movie.findMany({ where: filterWhere, orderBy: { releaseDate: "desc" } });
  }

  const ratingSummaries = await getRatingSummaries(results.map((m) => m.id));

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold text-white">
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
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
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
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
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
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
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
          <label htmlFor="yearFrom" className="text-xs text-neutral-400">
            Year from
          </label>
          <input
            id="yearFrom"
            name="yearFrom"
            type="number"
            defaultValue={params.yearFrom ?? ""}
            placeholder="1970"
            className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
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
            className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
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
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-accent focus:outline-none"
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
      ) : results.length === 0 ? (
        <p className="text-neutral-400">No movies matched your search.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {results.map((movie) => {
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
      )}
    </div>
  );
}
