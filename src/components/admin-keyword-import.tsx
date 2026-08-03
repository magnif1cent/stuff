"use client";

import { useState } from "react";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { TmdbKeyword } from "@/lib/tmdb";

interface DiscoverResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseDate: string | null;
  posterPath: string | null;
  overview: string;
  voteAverage: number;
  country: string | null;
  topCast: string[];
  alreadyImported: boolean;
}

interface DiscoverPage {
  results: DiscoverResult[];
  page: number;
  totalPages: number;
  totalResults: number;
}

// How many imports run at once when importing a batch — high enough to be
// fast, low enough not to hammer TMDB or the DB with a huge burst.
const IMPORT_CONCURRENCY = 4;

// A curated subset rather than all ~250 ISO countries — these cover where
// most martial arts films actually come from. TMDB's with_origin_country
// takes any valid ISO 3166-1 code, so this list is just for a friendlier
// picker, not a hard restriction.
const COUNTRY_OPTIONS = [
  { code: "", name: "Any country" },
  { code: "HK", name: "Hong Kong" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "TH", name: "Thailand" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

export function AdminKeywordImport() {
  const [keywordQuery, setKeywordQuery] = useState("");
  const [keywordOptions, setKeywordOptions] = useState<TmdbKeyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<TmdbKeyword[]>([]);
  const [searchingKeywords, setSearchingKeywords] = useState(false);
  const [country, setCountry] = useState("");

  const [results, setResults] = useState<DiscoverResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, failed: 0, total: 0 });

  async function handleKeywordSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keywordQuery.trim()) return;
    setSearchingKeywords(true);
    const res = await fetch(`/api/admin/tmdb/keywords?q=${encodeURIComponent(keywordQuery)}`);
    const body = await res.json();
    setSearchingKeywords(false);
    if (res.ok) setKeywordOptions(body.keywords);
  }

  function addKeyword(keyword: TmdbKeyword) {
    if (selectedKeywords.some((k) => k.id === keyword.id)) return;
    setSelectedKeywords((prev) => [...prev, keyword]);
    setKeywordOptions([]);
    setKeywordQuery("");
  }

  function removeKeyword(id: number) {
    setSelectedKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  async function fetchPage(targetPage: number): Promise<DiscoverPage | null> {
    const keywordIds = selectedKeywords.map((k) => k.id).join(",");
    const countryQuery = country ? `&country=${country}` : "";
    const res = await fetch(`/api/admin/tmdb/discover?keywords=${keywordIds}&page=${targetPage}${countryQuery}`);
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Search failed.");
      return null;
    }
    return body as DiscoverPage;
  }

  async function handleSearchMovies() {
    if (selectedKeywords.length === 0) return;
    setLoading(true);
    setMessage(null);
    const body = await fetchPage(1);
    setLoading(false);
    if (!body) return;

    setResults(body.results);
    setSelected(new Set(body.results.filter((r) => !r.alreadyImported).map((r) => r.tmdbId)));
    setPage(body.page);
    setTotalPages(body.totalPages);
    setTotalResults(body.totalResults);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    const body = await fetchPage(page + 1);
    setLoadingMore(false);
    if (!body) return;

    setResults((prev) => [...prev, ...body.results]);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of body.results) {
        if (!r.alreadyImported) next.add(r.tmdbId);
      }
      return next;
    });
    setPage(body.page);
    setTotalPages(body.totalPages);
  }

  function toggle(tmdbId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tmdbId)) next.delete(tmdbId);
      else next.add(tmdbId);
      return next;
    });
  }

  function selectAllLoaded() {
    setSelected(new Set(results.filter((r) => !r.alreadyImported).map((r) => r.tmdbId)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleImportSelected() {
    const queue = [...selected];
    if (queue.length === 0) return;

    setImporting(true);
    setMessage(null);
    setImportProgress({ done: 0, failed: 0, total: queue.length });

    let done = 0;
    let failed = 0;

    async function worker() {
      while (queue.length > 0) {
        const tmdbId = queue.shift();
        if (tmdbId === undefined) return;
        const res = await fetch("/api/admin/tmdb/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId }),
        });
        if (res.ok) {
          setResults((prev) => prev.map((r) => (r.tmdbId === tmdbId ? { ...r, alreadyImported: true } : r)));
        } else {
          failed += 1;
        }
        done += 1;
        setImportProgress({ done, failed, total: selected.size });
      }
    }

    await Promise.all(Array.from({ length: IMPORT_CONCURRENCY }, worker));

    setImporting(false);
    setSelected(new Set());
    setMessage(
      failed > 0
        ? `Imported ${done - failed} of ${done}. ${failed} failed — try those again individually.`
        : `Imported ${done} movie${done === 1 ? "" : "s"}.`,
    );
  }

  return (
    <div>
      <form onSubmit={handleKeywordSearch} className="mb-2 flex gap-2">
        <input
          type="text"
          value={keywordQuery}
          onChange={(e) => setKeywordQuery(e.target.value)}
          placeholder="Find a keyword (e.g. martial arts)"
          className="w-full max-w-md rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={searchingKeywords}
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {searchingKeywords ? "Searching…" : "Find keyword"}
        </button>
      </form>

      {keywordOptions.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {keywordOptions.map((keyword) => (
            <li key={keyword.id}>
              <button
                onClick={() => addKeyword(keyword)}
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                + {keyword.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedKeywords.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">Matching any of:</span>
          {selectedKeywords.map((keyword) => (
            <span
              key={keyword.id}
              className="flex items-center gap-1 rounded-full bg-red-700/20 px-3 py-1 text-xs text-red-400"
            >
              {keyword.name}
              <button
                onClick={() => removeKeyword(keyword.id)}
                className="text-red-400 hover:text-white"
                aria-label={`Remove ${keyword.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          Country
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleSearchMovies}
          disabled={loading || selectedKeywords.length === 0}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search movies"}
        </button>
      </div>

      {message && <p className="mb-4 text-sm text-neutral-300">{message}</p>}

      {results.length > 0 && (
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
                      <Image src={posterUrl} alt={movie.title} fill sizes="56px" className="object-cover" />
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
                onClick={handleLoadMore}
                disabled={loadingMore || importing}
                className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
            <button
              onClick={handleImportSelected}
              disabled={importing || selected.size === 0}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {importing
                ? `Importing ${importProgress.done}/${importProgress.total}…`
                : `Import selected (${selected.size})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
