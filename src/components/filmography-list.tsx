"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl } from "@/lib/tmdb";
import { SignatureVoteButton } from "@/components/actor-signature-vote";

export interface FilmographyRow {
  id: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  posterOverrideUrl: string | null;
  characterName: string | null;
  communityAverage: number | null;
}

// Every credit as a dense row rather than a poster grid -- some actors in
// this genre have well over a hundred films, and a grid of that many
// posters is the thing this component replaces (see DECISIONS.md). A text
// filter is the escape hatch for jumping straight to one title instead of
// scrolling a long list.
export function FilmographyList({ rows }: { rows: FilmographyRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((row) => row.title.toLowerCase().includes(q)) : rows;

  return (
    <div>
      <div className="relative mb-4 max-w-xs">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter filmography by title…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 py-2 pr-3 pl-8 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-red-600 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">No films match that title.</p>
      ) : (
        <div className="flex flex-col border-t border-neutral-800">
          {filtered.map((row) => {
            const posterUrl = resolvePosterUrl(row, "w200");
            return (
              <div key={row.id} className="flex items-center gap-3 border-b border-neutral-800 py-2">
                <Link
                  href={`/movies/${row.id}`}
                  className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-neutral-800"
                >
                  {posterUrl && (
                    <Image src={posterUrl} alt={row.title} fill sizes="32px" className="object-cover" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/movies/${row.id}`}
                    className="block truncate text-sm text-neutral-100 hover:text-red-500"
                  >
                    {row.title}
                  </Link>
                  {row.characterName && (
                    <p className="truncate text-xs text-neutral-500">as {row.characterName}</p>
                  )}
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-neutral-500 tabular-nums">
                  {row.year ?? ""}
                </span>
                <span className="w-12 shrink-0 text-right text-xs text-yellow-500 tabular-nums">
                  {row.communityAverage != null ? `★ ${row.communityAverage.toFixed(1)}` : ""}
                </span>
                <SignatureVoteButton kind="movie" id={row.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
