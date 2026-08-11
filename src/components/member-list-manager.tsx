"use client";

import { useState } from "react";
import Link from "next/link";
import { MovieCard, type MovieCardData } from "@/components/movie-card";
import { FightSceneResultCard, type FightSceneResult } from "@/components/fight-scene-result-card";
import type { AddToListItem } from "@/components/add-to-list-control";

export interface MemberListData {
  id: string;
  name: string;
  movies: MovieCardData[];
  fightScenes: (FightSceneResult & { initialLists: AddToListItem[]; initialFavorite: boolean })[];
}

export function MemberListManager({
  initialLists,
  viewerSignedIn,
}: {
  initialLists: MemberListData[];
  viewerSignedIn: boolean;
}) {
  const [lists, setLists] = useState(initialLists);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const body = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => [...prev, { id: body.list.id, name: body.list.name, movies: [], fightScenes: [] }]);
    setNewName("");
  }

  async function rename(id: string) {
    if (!editName.trim()) return;
    setError(null);
    const res = await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: body.list.name } : l)));
    setEditingId(null);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this list? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setLists((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      <form onSubmit={createList} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name…"
          className="w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="shrink-0 rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create list"}
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {lists.length === 0 && (
        <p className="text-sm text-neutral-500">
          You haven&rsquo;t created any lists yet. Lists are public — anyone with the link can view one.
        </p>
      )}

      {lists.map((list) => (
        <section key={list.id} className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            {editingId === list.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <button onClick={() => rename(list.id)} className="text-sm text-red-500 hover:underline">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="text-sm text-neutral-400 hover:text-white">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-white">{list.name}</h2>
                <Link href={`/lists/${list.id}`} className="text-xs text-neutral-400 underline hover:text-white">
                  Public link
                </Link>
                <button
                  onClick={() => {
                    setEditingId(list.id);
                    setEditName(list.name);
                  }}
                  className="text-xs text-neutral-400 hover:text-white"
                >
                  Rename
                </button>
                <button onClick={() => remove(list.id)} className="text-xs text-neutral-400 hover:text-red-400">
                  Delete
                </button>
              </>
            )}
          </div>
          {list.movies.length === 0 && list.fightScenes.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Nothing here yet — add movies or fight scenes from their own pages.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {list.movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
              {list.fightScenes.map((scene) => (
                <FightSceneResultCard
                  key={scene.id}
                  scene={scene}
                  initialLists={scene.initialLists}
                  signedIn={viewerSignedIn}
                  initialFavorite={scene.initialFavorite}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
