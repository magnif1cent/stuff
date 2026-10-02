"use client";

import { useState } from "react";
import { MemberListCard, type MemberListCardProps } from "@/components/member-list-card";

// The owner's own Lists tab: create, rename and delete, over the same
// one-card-per-list layout visitors see (MemberListCard).
export function MemberListManager({ initialLists }: { initialLists: MemberListCardProps[] }) {
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
    setLists((prev) => [
      ...prev,
      {
        id: body.list.id,
        name: body.list.name,
        description: null,
        isPrivate: body.list.isPrivate,
        isRanked: body.list.isRanked,
        movieCount: 0,
        fightSceneCount: 0,
        likeCount: 0,
        coverTiles: [],
        updatedLabel: "just now",
      },
    ]);
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

  const linkButton = "min-h-8 pr-2 text-xs text-neutral-400 hover:text-white";

  return (
    <div>
      <form onSubmit={createList} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New list name…"
          aria-label="New list name"
          className="w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-base text-neutral-100 focus:border-red-600 focus:outline-none sm:text-sm"
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

      {lists.length === 0 ? (
        <p className="text-sm text-neutral-500">
          You haven&rsquo;t created any lists yet. Lists are public by default — anyone with the link can view one.
          You can make a list private from its own page.
        </p>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2">
          {lists.map((list) => (
            <MemberListCard
              key={list.id}
              list={list}
              title={
                editingId === list.id ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="List name"
                      autoFocus
                      className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-base text-neutral-100 focus:border-red-600 focus:outline-none sm:text-sm"
                    />
                    <button onClick={() => rename(list.id)} className="text-sm text-red-500 hover:underline">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-neutral-400 hover:text-white">
                      Cancel
                    </button>
                  </span>
                ) : undefined
              }
              actions={
                editingId === list.id ? undefined : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(list.id);
                        setEditName(list.name);
                      }}
                      className={linkButton}
                    >
                      Rename
                    </button>
                    <button onClick={() => remove(list.id)} className={`${linkButton} px-2 hover:text-red-400`}>
                      Delete
                    </button>
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
