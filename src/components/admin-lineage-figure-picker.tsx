"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";
import { MAX_FIGURE_NAME_LENGTH } from "@/lib/lineage-constants";
import { GroupIcon } from "@/components/lineage-group-icon";

export interface LineageFigureRef {
  id: string;
  name: string;
  profilePath: string | null;
  personId: string | null;
  isGroup: boolean;
}

interface ActorSearchResult {
  personId: string;
  name: string;
  profilePath: string | null;
}
interface FigureSearchResult {
  figureId: string;
  name: string;
  isGroup: boolean;
}

const DEBOUNCE_MS = 250;

// Searches actors already in the catalog AND existing non-actor figures
// (a historical sifu, a character like Ip Man, a group like a stunt team)
// together, plus a trailing "not an actor? add by name" row -- with a
// checkbox to mark that new figure as a group -- for one that doesn't exist
// yet.
// Picking an actor result resolves (or lazily creates) their LineageFigure
// server-side before calling onChange, so callers always just get a ready-
// to-use figure -- they never have to know or care which kind was picked.
export function AdminLineageFigurePicker({
  value,
  onChange,
  placeholder,
  exclude,
}: {
  value: LineageFigureRef | null;
  onChange: (figure: LineageFigureRef) => void;
  placeholder?: string;
  exclude?: LineageFigureRef | null;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<{ actors: ActorSearchResult[]; figures: FigureSearchResult[] }>({
    actors: [],
    figures: [],
  });
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [addAsGroup, setAddAsGroup] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // No effect syncing `query` from `value`: callers that need the input's
  // text to reset when `value` is cleared/replaced from outside pass a
  // `key` derived from `value?.id` so React remounts this component
  // instead -- see admin-lineage-person-picker's original note (same
  // reasoning, same "setState synchronously in an effect" anti-pattern).
  const trimmedQuery = query.trim();
  const searchTerm = trimmedQuery && trimmedQuery !== value?.name ? trimmedQuery : null;

  useEffect(() => {
    if (!searchTerm) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/lineage/search?q=${encodeURIComponent(searchTerm)}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults({
          actors: (data.actors ?? []).filter((a: ActorSearchResult) => a.personId !== exclude?.personId),
          figures: (data.figures ?? []).filter((f: FigureSearchResult) => f.figureId !== exclude?.id),
        });
      } catch {
        setResults({ actors: [], figures: [] });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm, exclude]);

  const visible = searchTerm ? results : { actors: [], figures: [] };
  const hasExactMatch =
    visible.actors.some((a) => a.name.toLowerCase() === searchTerm?.toLowerCase()) ||
    visible.figures.some((f) => f.name.toLowerCase() === searchTerm?.toLowerCase());

  async function pickActor(actor: ActorSearchResult) {
    setResolving(true);
    setOpen(false);
    try {
      const res = await fetch("/api/admin/lineage/figures/resolve-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: actor.personId }),
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.figure);
        setQuery(data.figure.name);
      }
    } finally {
      setResolving(false);
    }
  }

  function pickFigure(figure: FigureSearchResult) {
    setOpen(false);
    onChange({ id: figure.figureId, name: figure.name, profilePath: null, personId: null, isGroup: figure.isGroup });
    setQuery(figure.name);
  }

  async function addAsFigure() {
    if (!searchTerm) return;
    setResolving(true);
    setOpen(false);
    try {
      const res = await fetch("/api/admin/lineage/figures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: searchTerm, isGroup: addAsGroup }),
      });
      if (res.ok) {
        const data = await res.json();
        onChange(data.figure);
        setQuery(data.figure.name);
        setAddAsGroup(false);
      }
    } finally {
      setResolving(false);
    }
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const showDropdown =
    open && (visible.actors.length > 0 || visible.figures.length > 0 || (!!searchTerm && !hasExactMatch));

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={resolving ? "Adding…" : query}
        disabled={resolving}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Search actors…"}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none disabled:opacity-60"
      />
      {value?.personId === null && !resolving && (
        <span className="mt-1 block text-[10px] text-neutral-500">
          {value.isGroup ? "A group, not an individual." : "Not an actor — a lineage-only figure."}
        </span>
      )}
      {showDropdown && (
        <ul className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 shadow-xl">
          {visible.actors.map((actor) => (
            <li key={actor.personId}>
              <button
                type="button"
                onClick={() => pickActor(actor)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              >
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                  {actor.profilePath && (
                    <Image
                      src={tmdbImageUrl(actor.profilePath, "w200") ?? ""}
                      alt=""
                      fill
                      unoptimized
                      sizes="24px"
                      className="object-cover"
                    />
                  )}
                </span>
                {actor.name}
              </button>
            </li>
          ))}
          {visible.figures.map((figure) => (
            <li key={figure.figureId}>
              <button
                type="button"
                onClick={() => pickFigure(figure)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              >
                {figure.isGroup ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-700 bg-amber-950/40 text-amber-600">
                    <GroupIcon className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-600 text-[9px] text-neutral-500">
                    &ndash;
                  </span>
                )}
                {figure.name}
                <span className="text-[10px] text-neutral-600">{figure.isGroup ? "group" : "not an actor"}</span>
              </button>
            </li>
          ))}
          {searchTerm && !hasExactMatch && searchTerm.length <= MAX_FIGURE_NAME_LENGTH && (
            <li className="border-t border-neutral-800">
              <label className="flex items-center gap-1.5 px-3 pt-2 text-[11px] text-neutral-500">
                <input
                  type="checkbox"
                  checked={addAsGroup}
                  onChange={(e) => setAddAsGroup(e.target.checked)}
                  className="h-3 w-3 rounded-sm border-neutral-600 bg-neutral-950 accent-red-700"
                />
                This is a group, not a person (e.g. a stunt team)
              </label>
              <button
                type="button"
                onClick={addAsFigure}
                className="flex w-full items-center gap-2 px-3 pt-1 pb-2 text-left text-sm text-red-500 hover:bg-neutral-800"
              >
                + Add &ldquo;{searchTerm}&rdquo; as a {addAsGroup ? "group" : "non-actor figure"}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
