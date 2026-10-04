"use client";

import { useState } from "react";
import type { TmdbKeyword } from "@/lib/tmdb";
import { useTmdbDiscoverImport, type TmdbDiscoverPage } from "@/hooks/use-tmdb-discover-import";
import { useTmdbDiscoverFilters } from "@/hooks/use-tmdb-discover-filters";
import { TmdbDiscoverResults } from "@/components/tmdb-discover-results";
import { TmdbDiscoverFilterFields } from "@/components/tmdb-discover-filter-fields";

export function AdminKeywordImport() {
  const [keywordQuery, setKeywordQuery] = useState("");
  const [keywordOptions, setKeywordOptions] = useState<TmdbKeyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<TmdbKeyword[]>([]);
  const [searchingKeywords, setSearchingKeywords] = useState(false);
  const filters = useTmdbDiscoverFilters();

  const discover = useTmdbDiscoverImport(async (targetPage) => {
    const keywordIds = selectedKeywords.map((k) => k.id).join(",");
    const res = await fetch(
      `/api/admin/tmdb/discover?keywords=${keywordIds}&page=${targetPage}${filters.toQueryString()}`,
    );
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body.error ?? "Search failed." };
    return { ok: true, data: body as TmdbDiscoverPage };
  });

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

      <TmdbDiscoverFilterFields filters={filters}>
        <button
          onClick={discover.search}
          disabled={discover.loading || selectedKeywords.length === 0}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {discover.loading ? "Searching…" : "Search movies"}
        </button>
      </TmdbDiscoverFilterFields>

      {discover.message && <p className="mb-4 text-sm text-neutral-300">{discover.message}</p>}

      <TmdbDiscoverResults discover={discover} />
    </div>
  );
}
