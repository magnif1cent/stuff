"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolvePosterUrl } from "@/lib/tmdb";
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function persistOrder(next: ReelItem[]) {
    setItems(next);
    const res = await fetch(`/api/lists/${listId}/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: next.map((item) => ({ kind: item.kind, id: item.id })) }),
    });
    if (!res.ok) {
      setItems(initialItems);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't save the new order.");
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
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
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.kind}-${item.id}`}
            className="flex items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900 p-3"
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
                    <Image src={posterUrl} alt={item.title} fill sizes="56px" className="object-cover" />
                  ) : null;
                })()
              ) : (
                <YoutubeThumbnailImage videoId={item.youtubeVideoId} title={item.title} textClassName="text-[7px]" />
              )}
              <span
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-t px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${
                  item.kind === "FIGHT_SCENE"
                    ? "bg-red-950 text-red-300"
                    : "bg-neutral-950 text-neutral-400"
                }`}
              >
                {item.kind === "FIGHT_SCENE" ? "FIGHT" : "FILM"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <Link href={item.href} className="truncate text-sm font-medium text-neutral-100 hover:text-red-500">
                {item.title}
              </Link>
              <p className="font-mono text-xs text-neutral-500">
                {ratingLine(item)}
                {item.kind === "FIGHT_SCENE" && ` · ${item.movieTitle}`}
                {item.kind === "MOVIE" && item.releaseYear ? ` · ${item.releaseYear}` : ""}
              </p>

              {editingNoteId === item.id ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    maxLength={MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH}
                    placeholder="Add a note…"
                    className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
                  />
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
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      title="Move down"
                      className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-white disabled:opacity-30"
                    >
                      ↓
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
        ))}
      </div>
    </div>
  );
}
