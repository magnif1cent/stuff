"use client";

import { useState } from "react";
import Link from "next/link";

export interface AddToListItem {
  id: string;
  name: string;
  hasItem: boolean;
}

export type ListTarget = { type: "movie"; id: string } | { type: "fightScene"; id: string };

function entriesEndpoint(listId: string, target: ListTarget) {
  return target.type === "movie" ? `/api/lists/${listId}/entries` : `/api/lists/${listId}/fight-scene-entries`;
}

function entryBodyKey(target: ListTarget) {
  return target.type === "movie" ? "movieId" : "fightSceneId";
}

const ICON_BUTTON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-md border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white";
const TEXT_BUTTON_CLASS = "rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800";

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" />
    </svg>
  );
}

export function AddToListControl({
  target,
  initialLists,
  signedIn,
  variant = "button",
}: {
  target: ListTarget;
  initialLists: AddToListItem[];
  signedIn: boolean;
  variant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(initialLists);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Link href="/login" title="Save to list" className={variant === "icon" ? ICON_BUTTON_CLASS : TEXT_BUTTON_CLASS}>
        {variant === "icon" ? <BookmarkIcon /> : "+ Add to list"}
      </Link>
    );
  }

  async function toggle(list: AddToListItem) {
    setBusy(true);
    setError(null);
    const res = await fetch(
      list.hasItem ? `${entriesEndpoint(list.id, target)}/${target.id}` : entriesEndpoint(list.id, target),
      {
        method: list.hasItem ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: list.hasItem ? undefined : JSON.stringify({ [entryBodyKey(target)]: target.id }),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, hasItem: !l.hasItem } : l)));
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const createRes = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const createBody = await createRes.json();
    if (!createRes.ok) {
      setBusy(false);
      setError(createBody.error ?? "Something went wrong.");
      return;
    }

    const addRes = await fetch(entriesEndpoint(createBody.list.id, target), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [entryBodyKey(target)]: target.id }),
    });
    setBusy(false);
    if (!addRes.ok) {
      const addBody = await addRes.json().catch(() => ({}));
      setError(addBody.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => [...prev, { id: createBody.list.id, name: createBody.list.name, hasItem: true }]);
    setNewName("");
  }

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} title="Save to list" className={variant === "icon" ? ICON_BUTTON_CLASS : TEXT_BUTTON_CLASS}>
        {variant === "icon" ? <BookmarkIcon /> : "+ Add to list"}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <ul className="mb-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {lists.map((list) => (
              <li key={list.id}>
                <label className="flex items-center gap-2 text-sm text-neutral-200">
                  <input type="checkbox" checked={list.hasItem} disabled={busy} onChange={() => toggle(list)} />
                  {list.name}
                </label>
              </li>
            ))}
            {lists.length === 0 && <p className="text-xs text-neutral-500">No lists yet.</p>}
          </ul>
          <form onSubmit={createAndAdd} className="flex gap-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list…"
              className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="shrink-0 rounded-md bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
