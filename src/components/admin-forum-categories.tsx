"use client";

import { useState } from "react";
import type { ForumCategory } from "@/generated/prisma/client";

type CategoryItem = Pick<ForumCategory, "id" | "slug" | "name" | "description"> & {
  _count: { threads: number };
};

export function AdminForumCategories({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/forum/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { category } = await res.json();
    setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setNewDescription("");
  }

  function startEdit(category: CategoryItem) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description ?? "");
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/forum/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { category } = await res.json();
    setCategories((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, name: category.name, slug: category.slug, description: category.description } : c))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this category? It must have no threads left in it.")) return;
    setError(null);
    const res = await fetch(`/api/admin/forum/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New board name, e.g. "Fan Theories"'
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          Add board
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <ul className="flex flex-col gap-2">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            {editingId === category.id ? (
              <>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(category.id)}
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
                <div>
                  <span className="text-sm text-neutral-100">{category.name}</span>
                  {category.description && (
                    <p className="text-xs text-neutral-500">{category.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  <span>
                    {category._count.threads} thread{category._count.threads === 1 ? "" : "s"}
                  </span>
                  <button onClick={() => startEdit(category)} className="text-neutral-400 hover:text-white">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(category.id)} className="text-neutral-400 hover:text-red-400">
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {categories.length === 0 && <p className="text-sm text-neutral-500">No boards yet.</p>}
      </ul>
    </div>
  );
}
