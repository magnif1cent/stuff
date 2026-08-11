"use client";

import { useState } from "react";
import Link from "next/link";
import type { TmdbMovieSearchResult } from "@/lib/tmdb";

type SubmissionResult = TmdbMovieSearchResult & { catalogStatus: string | null };

export function MovieSubmissionSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SubmissionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSubmittedMovie, setLastSubmittedMovie] = useState<{ id: string; title: string } | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set());
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setLastSubmittedMovie(null);
    const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(body.error ?? "Search failed.");
      return;
    }
    setResults(body.results);
  }

  async function handleSubmit(tmdbId: number) {
    setSubmittingId(tmdbId);
    setMessage(null);
    setLastSubmittedMovie(null);
    const res = await fetch("/api/movies/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    });
    const body = await res.json();
    setSubmittingId(null);
    if (!res.ok) {
      setMessage(body.error ?? "Submission failed.");
      return;
    }
    setSubmittedIds((prev) => new Set(prev).add(tmdbId));
    setLastSubmittedMovie({ id: body.movie.id, title: body.movie.title });
    setMessage(`"${body.movie.title}" submitted for review.`);
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search TMDB by title (e.g. Enter the Dragon)"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {message && (
        <p className="mb-4 text-sm text-neutral-300">
          {message}
          {lastSubmittedMovie && (
            <>
              {" "}
              <Link href={`/movies/${lastSubmittedMovie.id}`} className="text-red-500 hover:underline">
                View submission →
              </Link>
            </>
          )}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {results.map((movie) => {
          const alreadySubmitted = submittedIds.has(movie.id);
          const catalogLabel =
            movie.catalogStatus === "APPROVED"
              ? "Already in the catalog"
              : movie.catalogStatus === "PENDING"
                ? "Already submitted, awaiting review"
                : null;
          const disabled = !!catalogLabel || alreadySubmitted || submittingId === movie.id;

          return (
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
                {catalogLabel && <p className="mt-1 text-xs text-amber-400">{catalogLabel}</p>}
              </div>
              <button
                onClick={() => handleSubmit(movie.id)}
                disabled={disabled}
                className="shrink-0 rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
              >
                {submittingId === movie.id ? "Submitting…" : alreadySubmitted ? "Submitted" : "Submit for review"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
