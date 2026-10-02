"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FightScene, Movie } from "@/generated/prisma/client";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";

type MovieResult = Pick<Movie, "id" | "title" | "posterPath" | "posterOverrideUrl"> & {
  year: number | null;
  inList: boolean;
};
type FightSceneResult = Pick<FightScene, "id" | "title" | "youtubeVideoId"> & {
  movieTitle: string;
  ratingAverage: number | null;
  inList: boolean;
};
type ItemKind = "MOVIE" | "FIGHT_SCENE";
export type ListOrderItem = { kind: ItemKind; id: string };

const DEBOUNCE_MS = 250;

// Owner-only search box on a list's own page: find a movie or fight scene
// and add it without leaving the list (before this, items could only be
// added from each movie's or fight's own page). Results render inline below
// the input rather than as a floating dropdown, so the same layout works on
// a phone without a popover fighting the on-screen keyboard.
//
// `order` is the list's current top-to-bottom order (refreshed from the
// server after every add), used to tell the owner where a just-added item
// landed ("Added as #9") and to move it to the top in one tap — new items
// always land at the bottom of a ranked list, which is rarely where they
// belong.
export function ListAddItems({
  listId,
  isRanked,
  order,
}: {
  listId: string;
  isRanked: boolean;
  order: ListOrderItem[];
}) {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [fightScenes, setFightScenes] = useState<FightSceneResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Items added from this box since the page loaded, keyed `${kind}-${id}`.
  // Distinct from `inList` (already there before this search), since only
  // these get the "Added as #N" / Move to top treatment.
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [moving, setMoving] = useState<string | null>(null);
  const requestId = useRef(0);
  const router = useRouter();

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/lists/${listId}/search?q=${encodeURIComponent(trimmed)}`);
        if (requestId.current !== id) return;
        if (!res.ok) {
          setMovies([]);
          setFightScenes([]);
          return;
        }
        const data = await res.json();
        setMovies(data.movies ?? []);
        setFightScenes(data.fightScenes ?? []);
      } catch {
        if (requestId.current === id) {
          setMovies([]);
          setFightScenes([]);
        }
      } finally {
        if (requestId.current === id) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, listId]);

  async function add(kind: ItemKind, itemId: string) {
    setAdding(`${kind}-${itemId}`);
    setError(null);
    const res =
      kind === "MOVIE"
        ? await fetch(`/api/lists/${listId}/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movieId: itemId }),
          })
        : await fetch(`/api/lists/${listId}/fight-scene-entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fightSceneId: itemId }),
          });
    setAdding(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't add that to the list.");
      return;
    }
    setJustAdded((prev) => new Set(prev).add(`${kind}-${itemId}`));
    router.refresh();
  }

  async function moveToTop(kind: ItemKind, itemId: string) {
    const key = `${kind}-${itemId}`;
    setMoving(key);
    setError(null);
    const items = [{ kind, id: itemId }, ...order.filter((item) => !(item.kind === kind && item.id === itemId))];
    const res = await fetch(`/api/lists/${listId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setMoving(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't move that item.");
      return;
    }
    router.refresh();
  }

  function renderAddButton(kind: ItemKind, id: string, inList: boolean, title: string) {
    const key = `${kind}-${id}`;
    if (justAdded.has(key)) {
      // Position comes from the refreshed `order`; until the refresh lands
      // (or for an unranked list, where new items simply show first) this
      // is just a confirmation.
      const position = order.findIndex((item) => item.kind === kind && item.id === id) + 1;
      return (
        <span className="flex shrink-0 flex-col items-end gap-0.5 px-1">
          <span className="text-xs whitespace-nowrap text-amber-500">
            {isRanked && position > 0 ? `Added as #${position}` : "Added ✓"}
          </span>
          {isRanked && position > 1 && (
            <button
              type="button"
              disabled={moving === key}
              onClick={() => moveToTop(kind, id)}
              className="min-h-8 text-[13px] text-red-400 underline hover:text-red-300 disabled:opacity-60"
            >
              {moving === key ? "Moving…" : "Move to top"}
            </button>
          )}
        </span>
      );
    }
    if (inList) {
      return <span className="shrink-0 px-2 text-xs text-neutral-500">In list ✓</span>;
    }
    const busy = adding === key;
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => add(kind, id)}
        aria-label={`Add ${title} to this list`}
        className="inline-flex h-11 shrink-0 items-center rounded-full border border-neutral-700 bg-neutral-800 px-4 text-sm font-medium text-neutral-100 hover:border-neutral-600 disabled:opacity-60"
      >
        {busy ? "Adding…" : "+ Add"}
      </button>
    );
  }

  const showResults = trimmed.length > 0;
  const noMatches = showResults && !searching && movies.length === 0 && fightScenes.length === 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
          }}
          placeholder="Add a movie or fight to this list…"
          aria-label="Search for a movie or fight to add"
          className="min-h-12 w-full rounded-lg bg-transparent pr-12 pl-10 text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-neutral-400 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {showResults && (
        <div className="border-t border-neutral-800 p-2">
          {error && <p className="px-2 pb-2 text-xs text-red-500">{error}</p>}
          {searching && movies.length === 0 && fightScenes.length === 0 && (
            <p className="px-2 py-3 text-sm text-neutral-500">Searching…</p>
          )}
          {noMatches && <p className="px-2 py-3 text-sm text-neutral-500">No movies or fights match &ldquo;{trimmed}&rdquo;.</p>}

          {movies.length > 0 && (
            <div className="flex flex-col">
              <p className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-wide text-neutral-500 uppercase">Movies</p>
              {movies.map((movie) => {
                const posterUrl = resolvePosterUrl(movie, "w200");
                return (
                  <div key={movie.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                    <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-neutral-800">
                      {posterUrl && (
                        <Image src={posterUrl} alt="" fill unoptimized={isTmdbUrl(posterUrl)} sizes="32px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-100">{movie.title}</p>
                      {movie.year && <p className="text-xs text-neutral-500">{movie.year}</p>}
                    </div>
                    {renderAddButton("MOVIE", movie.id, movie.inList, movie.title)}
                  </div>
                );
              })}
            </div>
          )}

          {fightScenes.length > 0 && (
            <div className="mt-1 flex flex-col">
              <p className="px-2 pt-1 pb-1.5 font-mono text-[10px] tracking-wide text-neutral-500 uppercase">Fights · top rated first</p>
              {fightScenes.map((scene) => (
                <div key={scene.id} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                  <div className="relative h-[27px] w-12 shrink-0 overflow-hidden rounded bg-neutral-800">
                    <YoutubeThumbnailImage videoId={scene.youtubeVideoId} title={scene.title} textClassName="text-[6px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">{scene.title}</p>
                    <p className="truncate text-xs text-neutral-500">
                      from {scene.movieTitle}
                      {scene.ratingAverage !== null && ` · ★ ${scene.ratingAverage.toFixed(1)}`}
                    </p>
                  </div>
                  {renderAddButton("FIGHT_SCENE", scene.id, scene.inList, scene.title)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
