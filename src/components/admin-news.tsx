"use client";

import { useState } from "react";
import type { NewsPost } from "@/generated/prisma/client";

// Duplicated from src/lib/news.ts rather than imported — that module also
// imports the Prisma client (server-only, via the `pg` driver), which
// breaks client bundling if pulled into a "use client" component.
const MAX_NEWS_TITLE_LENGTH = 200;
const MAX_NEWS_CONTENT_LENGTH = 10000;

type PostItem = Pick<NewsPost, "id" | "title" | "content" | "createdAt"> & {
  author: { username: string };
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminNews({ initialPosts }: { initialPosts: PostItem[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { post } = await res.json();
    setPosts((prev) => [post, ...prev]);
    setNewTitle("");
    setNewContent("");
    setAdding(false);
  }

  function startEdit(post: PostItem) {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setError(null);
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { post } = await res.json();
    setPosts((prev) => prev.map((p) => (p.id === id ? post : p)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mb-6 rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600"
        >
          + New post
        </button>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mb-6 flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={MAX_NEWS_TITLE_LENGTH}
            placeholder="Post title"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            maxLength={MAX_NEWS_CONTENT_LENGTH}
            placeholder="Post content"
            rows={6}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !newTitle.trim() || !newContent.trim()}
              className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {saving ? "Publishing…" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewTitle("");
                setNewContent("");
              }}
              className="w-fit rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      <ul className="flex flex-col gap-3">
        {posts.map((post) => (
          <li key={post.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
            {editingId === post.id ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={MAX_NEWS_TITLE_LENGTH}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={MAX_NEWS_CONTENT_LENGTH}
                  rows={6}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => saveEdit(post.id)}
                    disabled={saving}
                    className="text-xs text-neutral-300 hover:text-white"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-neutral-400 hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-neutral-100">{post.title}</h3>
                  <div className="flex shrink-0 gap-3 text-xs text-neutral-500">
                    <button onClick={() => startEdit(post)} className="hover:text-white">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="hover:text-red-400">
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mb-2 text-xs text-neutral-500">
                  {post.author.username} · {formatDate(post.createdAt)}
                </p>
                <p className="line-clamp-2 whitespace-pre-wrap text-sm text-neutral-400">{post.content}</p>
              </>
            )}
          </li>
        ))}
        {posts.length === 0 && <p className="text-sm text-neutral-500">No posts yet.</p>}
      </ul>
    </div>
  );
}
