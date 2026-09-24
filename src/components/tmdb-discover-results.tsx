"use client";

import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { useTmdbDiscoverImport } from "@/hooks/use-tmdb-discover-import";

// Renders the paged result grid + batch-import controls shared by the admin
// "By keyword" and "By actor" import tabs — everything downstream of the
// TMDB discover call itself, which each caller's useTmdbDiscoverImport
// instance already differs on.
export function TmdbDiscoverResults({ discover }: { discover: ReturnType<typeof useTmdbDiscoverImport> }) {
  const {
    results,
    selected,
    page,
    totalPages,
    totalResults,
    loadingMore,
    importing,
    importProgress,
    toggle,
    selectAllLoaded,
    clearSelection,
    loadMore,
    importSelected,
  } = discover;

  if (results.length === 0) return null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-400">
        <span>
          {selected.size} selected of {results.length} loaded ({totalResults} total matches)
        </span>
        <span className="flex gap-3">
          <button onClick={selectAllLoaded} className="text-neutral-300 hover:text-white">
            Select all loaded
          </button>
          <button onClick={clearSelection} className="text-neutral-300 hover:text-white">
            Clear selection
          </button>
        </span>
      </div>

      <ul className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {results.map((movie) => {
          const posterUrl = tmdbImageUrl(movie.posterPath, "w200");
          const year = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;
          return (
            <li
              key={movie.tmdbId}
              className={`flex gap-3 rounded-md border border-neutral-800 p-3 ${
                movie.alreadyImported ? "opacity-50" : "bg-neutral-900"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(movie.tmdbId)}
                disabled={movie.alreadyImported || importing}
                onChange={() => toggle(movie.tmdbId)}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden rounded bg-neutral-800">
                {posterUrl && (
                  <Image src={posterUrl} alt={movie.title} fill unoptimized sizes="56px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {movie.title} {year && <span className="text-neutral-500">({year})</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {[movie.country, movie.topCast.join(", ")].filter(Boolean).join(" · ")}
                  {movie.alreadyImported && " · Already in catalog"}
                </p>
                <p className="line-clamp-2 text-xs text-neutral-400">{movie.overview}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        {page < totalPages && (
          <button
            onClick={loadMore}
            disabled={loadingMore || importing}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
        <button
          onClick={importSelected}
          disabled={importing || selected.size === 0}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {importing
            ? `Importing ${importProgress.done}/${importProgress.total}…`
            : `Import selected (${selected.size})`}
        </button>
      </div>
    </>
  );
}
