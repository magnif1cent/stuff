"use client";

import { useState } from "react";
import type { TmdbMovieSearchResult } from "@/lib/tmdb";
import { AdminKeywordImport } from "@/components/admin-keyword-import";

export function AdminImportSearch() {
  const [mode, setMode] = useState<"title" | "keyword">("title");

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-neutral-800">
        <button
          onClick={() => setMode("title")}
          className={`px-3 py-2 text-sm font-medium ${
            mode === "title" ? "border-b-2 border-red-600 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          By title
        </button>
        <button
          onClick={() => setMode("keyword")}
          className={`px-3 py-2 text-sm font-medium ${
            mode === "keyword" ? "border-b-2 border-red-600 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          By keyword
        </button>
      </div>

      {mode === "keyword" && <AdminKeywordImport />}
      {mode === "title" && <TitleSearch />}
    </div>
  );
}

function TitleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbMovieSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/admin/tmdb/search?q=${encodeURIComponent(query)}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(body.error ?? "Search failed.");
      return;
    }
    setResults(body.results);
  }

  async function handleImport(tmdbId: number) {
    setImportingId(tmdbId);
    setMessage(null);
    const res = await fetch("/api/admin/tmdb/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    });
    const body = await res.json();
    setImportingId(null);
    if (!res.ok) {
      setMessage(body.error ?? "Import failed.");
      return;
    }
    setMessage(`Imported "${body.movie.title}".`);
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search TMDB by title (e.g. Enter the Dragon)"
          className="w-full max-w-md rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {message && <p className="mb-4 text-sm text-neutral-300">{message}</p>}

      <ul className="flex flex-col gap-3">
        {results.map((movie) => (
          <li
            key={movie.id}
            className="flex items-center justify-between gap-4 rounded-md border border-neutral-800 bg-neutral-900 p-3"
          >
            <div>
              <p className="font-medium text-white">
                {movie.title}{" "}
                <span className="text-neutral-500">
                  {movie.release_date ? `(${movie.release_date.slice(0, 4)})` : ""}
                </span>
              </p>
              <p className="line-clamp-2 max-w-xl text-sm text-neutral-400">{movie.overview}</p>
            </div>
            <button
              onClick={() => handleImport(movie.id)}
              disabled={importingId === movie.id}
              className="shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
            >
              {importingId === movie.id ? "Importing…" : "Import"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
