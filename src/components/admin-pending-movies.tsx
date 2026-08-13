"use client";

import { useState } from "react";
import type { Movie } from "@/generated/prisma/client";

type PendingMovieItem = Pick<Movie, "id" | "title"> & {
  releaseDate: string | null;
  submittedBy: { username: string } | null;
};

export function AdminPendingMovies({ initialMovies }: { initialMovies: PendingMovieItem[] }) {
  const [movies, setMovies] = useState(initialMovies);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/movies/${id}/approve`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setMovies((prev) => prev.filter((m) => m.id !== id));
  }

  async function reject(id: string, title: string) {
    if (!window.confirm(`Reject and permanently remove "${title}"?`)) return;
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/admin/movies/${id}/reject`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setMovies((prev) => prev.filter((m) => m.id !== id));
  }

  if (movies.length === 0) {
    return <p className="text-sm text-neutral-500">No pending submissions.</p>;
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      <ul className="flex flex-col gap-2">
        {movies.map((movie) => {
          const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
          return (
            <li
              key={movie.id}
              className="flex items-center justify-between gap-2 rounded-md border border-amber-800/50 bg-amber-950/20 px-3 py-2"
            >
              <div>
                <span className="text-sm text-neutral-100">
                  {movie.title} {year && <span className="text-neutral-500">({year})</span>}
                </span>
                <p className="text-xs text-neutral-500">Submitted by {movie.submittedBy?.username ?? "a member"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => approve(movie.id)}
                  disabled={busyId === movie.id}
                  className="rounded-md bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(movie.id, movie.title)}
                  disabled={busyId === movie.id}
                  className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
