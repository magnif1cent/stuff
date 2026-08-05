"use client";

import { useState } from "react";
import Link from "next/link";

export interface AddToListItem {
  id: string;
  name: string;
  hasMovie: boolean;
}

export function AddToListControl({
  movieId,
  initialLists,
  signedIn,
}: {
  movieId: string;
  initialLists: AddToListItem[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState(initialLists);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
      >
        + Add to list
      </Link>
    );
  }

  async function toggle(list: AddToListItem) {
    setBusy(true);
    setError(null);
    const res = await fetch(
      list.hasMovie ? `/api/lists/${list.id}/entries/${movieId}` : `/api/lists/${list.id}/entries`,
      {
        method: list.hasMovie ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: list.hasMovie ? undefined : JSON.stringify({ movieId }),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, hasMovie: !l.hasMovie } : l)));
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

    const addRes = await fetch(`/api/lists/${createBody.list.id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieId }),
    });
    setBusy(false);
    if (!addRes.ok) {
      const addBody = await addRes.json().catch(() => ({}));
      setError(addBody.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => [...prev, { id: createBody.list.id, name: createBody.list.name, hasMovie: true }]);
    setNewName("");
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
      >
        + Add to list
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <ul className="mb-3 flex max-h-48 flex-col gap-1 overflow-y-auto">
            {lists.map((list) => (
              <li key={list.id}>
                <label className="flex items-center gap-2 text-sm text-neutral-200">
                  <input type="checkbox" checked={list.hasMovie} disabled={busy} onChange={() => toggle(list)} />
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
