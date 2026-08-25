"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";
import { MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH } from "@/lib/member-lists";

export type ReelItem =
  | {
      kind: "MOVIE";
      id: string;
      rank: number | null;
      note: string | null;
      title: string;
      href: string;
      posterPath: string | null;
      posterOverrideUrl: string | null;
      releaseYear: number | null;
      ratingAverage: number | null;
      ratingCount: number;
    }
  | {
      kind: "FIGHT_SCENE";
      id: string;
      rank: number | null;
      note: string | null;
      title: string;
      href: string;
      youtubeVideoId: string;
      movieId: string;
      movieTitle: string;
      ratingAverage: number | null;
      ratingCount: number;
    };

function ratingLine(item: ReelItem) {
  if (item.ratingAverage == null) return "No ratings yet";
  return `★ ${item.ratingAverage.toFixed(1)} · ${item.ratingCount} rating${item.ratingCount === 1 ? "" : "s"}`;
}

function noteEndpoint(listId: string, item: ReelItem) {
  return item.kind === "MOVIE"
    ? `/api/lists/${listId}/entries/${item.id}`
    : `/api/lists/${listId}/fight-scene-entries/${item.id}`;
}

function removeEndpoint(listId: string, item: ReelItem) {
  return noteEndpoint(listId, item);
}

// The single row-based layout for a list's items — used whether or not the
// list is ranked, so a "Top 10 Fight Scenes" and a plain unordered list read
// as the same kind of thing, not two different page layouts. `isRanked`
// controls only the two ranking-specific pieces: the position number and the
// owner's up/down reorder controls. Notes and removal stay available to the
// owner either way — they're list-management, not ranking-specific.
export function ListItemRows({
  listId,
  initialItems,
  isRanked,
  isOwnList,
}: {
  listId: string;
  initialItems: ReelItem[];
  isRanked: boolean;
  isOwnList: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  // `initialItems` only seeds state on mount — without tracking it like
  // this, toggling Ranked list calls router.refresh(), the server
  // recomputes reelItems in the new sort order, but this component keeps
  // rendering the order it first mounted with until something else (a note
  // save, a remove) happens to touch `items`. Adjusting state during render
  // when the prop reference changes (React's documented alternative to an
  // effect for this) keeps row order matching the server's after any
  // refresh, ranking toggle included.
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Client-side only — lists cap at 200 items (see the item-cap decision in
  // DECISIONS.md), small enough that filtering the already-fetched array
  // beats round-tripping to the server for this. Matches title, note, and
  // (for a fight scene) its parent movie's title, so searching a movie name
  // also surfaces scenes from it. Reorder buttons still act on `items`, the
  // full unfiltered array — a move-to-top while filtered moves the item to
  // the top of the whole list, not just the visible subset, since filtering
  // is a view, not a different order.
  const query = search.trim().toLowerCase();
  const visibleIndices = !query
    ? items.map((_, i) => i)
    : items.reduce<number[]>((acc, item, i) => {
        const haystack = `${item.title} ${item.note ?? ""} ${item.kind === "FIGHT_SCENE" ? item.movieTitle : ""}`.toLowerCase();
        if (haystack.includes(query)) acc.push(i);
        return acc;
      }, []);

  async function persistOrder(next: ReelItem[]) {
    setReordering(true);
    setItems(next);
    const res = await fetch(`/api/lists/${listId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next.map((item) => ({ kind: item.kind, id: item.id })) }),
    });
    setReordering(false);
    if (!res.ok) {
      setItems(initialItems);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save the new order.");
    }
  }

  function move(index: number, direction: -1 | 1) {
    if (reordering) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  function moveToEnd(index: number, end: "top" | "bottom") {
    if (reordering) return;
    if (end === "top" && index === 0) return;
    if (end === "bottom" && index === items.length - 1) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(end === "top" ? 0 : next.length, 0, moved);
    void persistOrder(next);
  }

  async function saveNote(item: ReelItem) {
    setBusyId(item.id);
    setError(null);
    const res = await fetch(noteEndpoint(listId, item), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteDraft.trim() || null }),
    });
    setBusyId(null);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Couldn't save that note.");
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id && i.kind === item.kind ? { ...i, note: body.entry.note } : i)));
    setEditingNoteId(null);
  }

  async function remove(item: ReelItem) {
    if (!window.confirm("Remove this from the list?")) return;
    setBusyId(item.id);
    setError(null);
    const res = await fetch(removeEndpoint(listId, item), { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't remove that item.");
      return;
    }
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.kind === item.kind)));
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      {items.length > 4 && (
        <div className="relative mb-3 max-w-xs">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this list…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              title="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      )}
      {query && visibleIndices.length === 0 ? (
        <p className="text-sm text-neutral-400">No items in this list match &ldquo;{search.trim()}&rdquo;.</p>
      ) : (
      <div className="flex flex-col gap-2">
        {visibleIndices.map((index) => {
          const item = items[index];
          // When a fight scene's own movie is separately in this same list,
          // note the relationship instead of leaving it implicit — this is
          // exactly the "mixed reel" idea (a scene and its film ranked
          // against each other), worth surfacing rather than just letting
          // two unrelated-looking rows happen to share a title.
          const relatedMovieIndex =
            item.kind === "FIGHT_SCENE"
              ? items.findIndex((i) => i.kind === "MOVIE" && i.id === item.movieId)
              : -1;

          return (
          <div
            key={`${item.kind}-${item.id}`}
            className={`flex items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900 p-3 border-l-4 ${
              item.kind === "FIGHT_SCENE" ? "border-l-red-700" : "border-l-neutral-600"
            }`}
          >
            {isRanked && (
              <span className="w-8 shrink-0 text-center font-serif text-xl font-bold text-neutral-600">
                {index + 1}
              </span>
            )}

            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-neutral-800">
              {item.kind === "MOVIE" ? (
                (() => {
                  const posterUrl = resolvePosterUrl(item, "w200");
                  return posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={item.title}
                      fill
                      unoptimized={isTmdbUrl(posterUrl)}
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-neutral-500">
                      {item.title}
                    </div>
                  );
                })()
              ) : (
                <YoutubeThumbnailImage videoId={item.youtubeVideoId} title={item.title} textClassName="text-[7px]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase ${
                    item.kind === "FIGHT_SCENE"
                      ? "border-red-800 bg-red-950/70 text-red-300"
                      : "border-neutral-600 bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {item.kind === "FIGHT_SCENE" ? (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M7 5v14M17 5v14M2 10h5M17 10h5M2 15h5M17 15h5" />
                    </svg>
                  )}
                  {item.kind === "FIGHT_SCENE" ? "Fight" : "Film"}
                </span>
                <Link
                  href={item.href}
                  className="min-w-0 truncate text-sm font-medium text-neutral-100 hover:text-red-500"
                >
                  {item.title}
                </Link>
              </div>
              <p className="font-mono text-xs text-neutral-500">
                {ratingLine(item)}
                {item.kind === "FIGHT_SCENE" && ` · ${item.movieTitle}`}
                {item.kind === "MOVIE" && item.releaseYear ? ` · ${item.releaseYear}` : ""}
                {relatedMovieIndex !== -1 && (
                  <span className="text-neutral-600">
                    {" · "}
                    {isRanked ? `also #${relatedMovieIndex + 1} in this list` : "also in this list"}
                  </span>
                )}
              </p>

              {editingNoteId === item.id ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveNote(item);
                      if (e.key === "Escape") setEditingNoteId(null);
                    }}
                    maxLength={MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH}
                    placeholder="Add a note…"
                    className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
                  />
                  <span className="shrink-0 font-mono text-[10px] text-neutral-600">
                    {noteDraft.length} / {MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH}
                  </span>
                  <button
                    onClick={() => saveNote(item)}
                    disabled={busyId === item.id}
                    className="shrink-0 text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingNoteId(null)} className="shrink-0 text-xs text-neutral-400 hover:text-white">
                    Cancel
                  </button>
                </div>
              ) : item.note ? (
                <p className="mt-1 text-sm text-neutral-300 italic">&ldquo;{item.note}&rdquo;</p>
              ) : null}
            </div>

            {isOwnList && (
              <div className="flex shrink-0 items-center gap-1">
                {editingNoteId !== item.id && (
                  <button
                    onClick={() => {
                      setEditingNoteId(item.id);
                      setNoteDraft(item.note ?? "");
                    }}
                    title="Edit note"
                    className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white"
                  >
                    ✎
                  </button>
                )}
                {isRanked && (
                  <>
                    <button
                      onClick={() => moveToEnd(index, "top")}
                      disabled={index === 0 || reordering}
                      title="Move to top"
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                    >
                      ⇈
                    </button>
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reordering}
                      title="Move up"
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1 || reordering}
                      title="Move down"
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => moveToEnd(index, "bottom")}
                      disabled={index === items.length - 1 || reordering}
                      title="Move to bottom"
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                    >
                      ⇊
                    </button>
                  </>
                )}
                <button
                  onClick={() => remove(item)}
                  disabled={busyId === item.id}
                  title="Remove"
                  className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
