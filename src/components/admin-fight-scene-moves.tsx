"use client";

import { useState } from "react";
import type { FightSceneMove } from "@/generated/prisma/client";

type MoveItem = Pick<FightSceneMove, "id" | "name"> & { _count: { fightScenes: number } };

export function AdminFightSceneMoves({ initialMoves }: { initialMoves: MoveItem[] }) {
  const [moves, setMoves] = useState(initialMoves);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/fight-scene-moves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { move } = await res.json();
    setMoves((prev) => [...prev, move].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
  }

  function startEdit(move: MoveItem) {
    setEditingId(move.id);
    setEditName(move.name);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/fight-scene-moves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { move } = await res.json();
    setMoves((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: move.name } : m)).sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this move? It will be removed from any fight scenes using it.")) return;
    setError(null);
    const res = await fetch(`/api/admin/fight-scene-moves/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setMoves((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New move name, e.g. "Flying Kick"'
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          Add move
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <ul className="flex flex-col gap-2">
        {moves.map((move) => (
          <li
            key={move.id}
            className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
          >
            {editingId === move.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(move.id)}
                    disabled={saving}
                    className="text-xs text-neutral-300 hover:text-white"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-neutral-400 hover:text-white">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm text-neutral-100">{move.name}</span>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>
                    {move._count.fightScenes} scene{move._count.fightScenes === 1 ? "" : "s"}
                  </span>
                  <button onClick={() => startEdit(move)} className="text-neutral-400 hover:text-white">
                    Rename
                  </button>
                  <button onClick={() => handleDelete(move.id)} className="text-neutral-400 hover:text-red-400">
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {moves.length === 0 && <p className="text-sm text-neutral-500">No moves yet.</p>}
      </ul>
    </div>
  );
}
