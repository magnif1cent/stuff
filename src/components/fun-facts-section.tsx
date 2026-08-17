"use client";

import { useState } from "react";

const MAX_CONTENT_LENGTH = 500;

export interface FunFactItem {
  id: string;
  content: string;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: { username: string };
  up: number;
  down: number;
  myVote: 1 | -1 | null;
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function wasEdited(item: FunFactItem) {
  return new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;
}

// Highest net score (up - down) first; stable otherwise, so ties keep
// whatever order they arrived in (newest-submitted first, from the server).
function byNetScore(a: FunFactItem, b: FunFactItem) {
  return b.up - b.down - (a.up - a.down);
}

export function FunFactsSection({
  movieId,
  initialFacts,
  signedIn,
  currentUserId,
  isAdmin,
}: {
  movieId: string;
  initialFacts: FunFactItem[];
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [facts, setFacts] = useState(initialFacts);
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  function updateFact(id: string, updater: (item: FunFactItem) => FunFactItem) {
    setFacts((prev) => prev.map((f) => (f.id === id ? updater(f) : f)).sort(byNetScore));
  }

  async function submit() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fun-facts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { fact } = await res.json();
    setFacts((prev) => [{ ...fact, up: 0, down: 0, myVote: null }, ...prev].sort(byNetScore));
    setNewContent("");
  }

  function startEdit(item: FunFactItem) {
    setEditingId(item.id);
    setEditContent(item.content);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fun-facts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { fact } = await res.json();
    updateFact(id, (item) => ({ ...item, content: fact.content, updatedAt: fact.updatedAt }));
    cancelEdit();
  }

  async function deleteFact(id: string) {
    if (!window.confirm("Delete this fun fact? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fun-facts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    // Unlike discussion posts, nothing else references a fun fact (no
    // replies), and the server already excludes soft-deleted ones on
    // reload -- so just drop it from the list rather than showing a
    // "[deleted]" placeholder that would only ever appear pre-refresh.
    setFacts((prev) => prev.filter((f) => f.id !== id));
  }

  async function vote(id: string, value: 1 | -1) {
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fun-facts/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { myVote, up, down } = await res.json();
    updateFact(id, (item) => ({ ...item, myVote, up, down }));
  }

  return (
    <section className="mt-10 max-w-2xl">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">Fun Facts</h2>

      <div className="rounded-md border border-neutral-800 bg-neutral-900">
        {signedIn ? (
          <div className="flex flex-col gap-2 border-b border-neutral-800 p-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Did you know…?"
              rows={2}
              maxLength={MAX_CONTENT_LENGTH}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={submit}
                disabled={submitting || !newContent.trim()}
                className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                Add fun fact
              </button>
              <span className="text-xs text-neutral-500">
                {newContent.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        ) : (
          <p className="border-b border-neutral-800 p-3 text-sm text-neutral-400">
            <a href="/login" className="text-red-500 hover:underline">
              Sign in
            </a>{" "}
            to add a fun fact.
          </p>
        )}

        <ul className="divide-y divide-neutral-800">
          {facts.map((fact) => {
            const canEdit = currentUserId === fact.submittedById;
            const canDelete = canEdit || isAdmin;
            const canVote = signedIn && !canEdit;

            return (
              <li key={fact.id} className="flex gap-3 p-3">
                <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                <button
                  onClick={() => (canVote ? vote(fact.id, 1) : undefined)}
                  disabled={!canVote}
                  title={canEdit ? "You can't vote on your own fun fact" : undefined}
                  className={`rounded px-1.5 py-0.5 text-sm leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    fact.myVote === 1 ? "text-green-500" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  👍
                </button>
                <span className="text-xs text-neutral-400">{fact.up - fact.down}</span>
                <button
                  onClick={() => (canVote ? vote(fact.id, -1) : undefined)}
                  disabled={!canVote}
                  title={canEdit ? "You can't vote on your own fun fact" : undefined}
                  className={`rounded px-1.5 py-0.5 text-sm leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    fact.myVote === -1 ? "text-red-500" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  👎
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-medium text-neutral-100">{fact.submittedBy.username}</span>
                  <span className="text-neutral-500">{timeAgo(fact.createdAt)}</span>
                  {wasEdited(fact) && <span className="text-xs text-neutral-600">(edited)</span>}
                  {(canEdit || canDelete) && (
                    <span className="inline-flex gap-2">
                      {canEdit && (
                        <button
                          onClick={() => startEdit(fact)}
                          className="text-xs text-neutral-400 hover:text-white"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => deleteFact(fact.id)}
                          className="text-xs text-neutral-400 hover:text-red-400"
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </div>

                {editingId === fact.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      maxLength={MAX_CONTENT_LENGTH}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(fact.id)}
                        disabled={submitting || !editContent.trim()}
                        className="w-fit rounded-md bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-fit rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-300">{fact.content}</p>
                )}
              </div>
              </li>
            );
          })}
          {facts.length === 0 && (
            <li className="p-3 text-sm text-neutral-500">No fun facts yet. Be the first to add one.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
