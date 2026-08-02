"use client";

import { useState } from "react";
import type { Movie } from "@/generated/prisma/client";

type MovieItem = Pick<Movie, "id" | "title"> & {
  releaseDate: string | null;
  _count: { ratings: number; discussionPosts: number; fightScenes: number };
};

export function AdminMovieList({ initialMovies }: { initialMovies: MovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = movies.filter((movie) => movie.title.toLowerCase().includes(query.trim().toLowerCase()));

  function startDelete(id: string) {
    setConfirmId(id);
    setConfirmText("");
    setError(null);
  }

  async function handleDelete(movie: MovieItem) {
    if (confirmText.trim() !== movie.title) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/movies/${movie.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setMovies((prev) => prev.filter((m) => m.id !== movie.id));
    setConfirmId(null);
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by title…"
        className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
      />

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <ul className="flex flex-col gap-2">
        {filtered.map((movie) => {
          const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
          return (
            <li key={movie.id} className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm text-neutral-100">
                    {movie.title} {year && <span className="text-neutral-500">({year})</span>}
                  </span>
                  <p className="text-xs text-neutral-500">
                    {movie._count.ratings} rating{movie._count.ratings === 1 ? "" : "s"} &middot;{" "}
                    {movie._count.discussionPosts} post{movie._count.discussionPosts === 1 ? "" : "s"} &middot;{" "}
                    {movie._count.fightScenes} fight scene{movie._count.fightScenes === 1 ? "" : "s"}
                  </p>
                </div>
                {confirmId !== movie.id && (
                  <button
                    onClick={() => startDelete(movie.id)}
                    className="shrink-0 text-xs text-neutral-400 hover:text-red-400"
                  >
                    Delete
                  </button>
                )}
              </div>

              {confirmId === movie.id && (
                <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/20 p-3">
                  <p className="mb-2 text-xs text-red-400">
                    Type <span className="font-semibold">{movie.title}</span> to permanently delete it.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                    />
                    <button
                      onClick={() => handleDelete(movie)}
                      disabled={deleting || confirmText.trim() !== movie.title}
                      className="rounded-md bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button onClick={() => setConfirmId(null)} className="text-xs text-neutral-400 hover:text-white">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-neutral-500">No movies found.</p>}
      </ul>
    </div>
  );
}
