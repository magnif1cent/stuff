"use client";

import { useState } from "react";

export interface TmdbDiscoverResult {
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

export interface TmdbDiscoverPage {
  results: TmdbDiscoverResult[];
  page: number;
  totalPages: number;
  totalResults: number;
}

type FetchPageResult = { ok: true; data: TmdbDiscoverPage } | { ok: false; error: string };

// How many imports run at once when importing a batch — high enough to be
// fast, low enough not to hammer TMDB or the DB with a huge burst.
const IMPORT_CONCURRENCY = 4;

// Shared by the "By keyword" and "By actor" admin import tabs: both search
// TMDB's /discover/movie by a different filter (keyword ids vs. a person id)
// but otherwise share identical paging, selection, and batch-import
// behavior. `fetchPage` is the only thing that differs between callers.
export function useTmdbDiscoverImport(fetchPage: (page: number) => Promise<FetchPageResult>) {
  const [results, setResults] = useState<TmdbDiscoverResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, failed: 0, total: 0 });

  async function search() {
    setLoading(true);
    setMessage(null);
    const result = await fetchPage(1);
    setLoading(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setResults(result.data.results);
    setSelected(new Set(result.data.results.filter((r) => !r.alreadyImported).map((r) => r.tmdbId)));
    setPage(result.data.page);
    setTotalPages(result.data.totalPages);
    setTotalResults(result.data.totalResults);
  }

  async function loadMore() {
    setLoadingMore(true);
    const result = await fetchPage(page + 1);
    setLoadingMore(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setResults((prev) => [...prev, ...result.data.results]);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of result.data.results) {
        if (!r.alreadyImported) next.add(r.tmdbId);
      }
      return next;
    });
    setPage(result.data.page);
    setTotalPages(result.data.totalPages);
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

  async function importSelected() {
    const queue = [...selected];
    const total = queue.length;
    if (total === 0) return;

    setImporting(true);
    setMessage(null);
    setImportProgress({ done: 0, failed: 0, total });

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
        setImportProgress({ done, failed, total });
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

  return {
    results,
    selected,
    page,
    totalPages,
    totalResults,
    loading,
    loadingMore,
    message,
    importing,
    importProgress,
    search,
    loadMore,
    toggle,
    selectAllLoaded,
    clearSelection,
    importSelected,
  };
}
