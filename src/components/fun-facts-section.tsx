"use client";

import { useState } from "react";

const MAX_CONTENT_LENGTH = 500;
const PAGE_SIZE = 5;

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function wasEdited(item: FunFactItem) {
  return new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;
}

// Highest net score (up - down) first; ties broken by newest first.
function byNetScore(a: FunFactItem, b: FunFactItem) {
  const scoreDiff = b.up - b.down - (a.up - a.down);
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
  // Tracked by id rather than array index, since voting re-sorts `facts` by
  // net score -- an index would silently jump the spotlight to a different
  // fact the moment the current one's score changes.
  const [spotlightId, setSpotlightId] = useState<string | null>(initialFacts[0]?.id ?? null);
  const [page, setPage] = useState(1);
  const [showList, setShowList] = useState(false);

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
    const newFact = { ...fact, up: 0, down: 0, myVote: null };
    const next = [newFact, ...facts].sort(byNetScore);
    setFacts(next);
    if (facts.length === 0) setSpotlightId(newFact.id);
    // Jump to whichever page the fact you just posted landed on (a
    // brand-new, unvoted fact can sort anywhere among other 0-net-score
    // facts, not necessarily page 1).
    setPage(Math.floor(next.findIndex((f) => f.id === newFact.id) / PAGE_SIZE) + 1);
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
    const remaining = facts.filter((f) => f.id !== id);
    setFacts(remaining);
    if (spotlightId === id) setSpotlightId(remaining[0]?.id ?? null);
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

  function shiftSpotlight(direction: 1 | -1) {
    if (facts.length === 0) return;
    const currentIndex = facts.findIndex((f) => f.id === spotlightId);
    const base = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (base + direction + facts.length) % facts.length;
    setSpotlightId(facts[nextIndex].id);
    // Jump to whichever page the newly-spotlighted fact's list row is on,
    // rather than leaving it paginated out of view.
    setPage(Math.floor(nextIndex / PAGE_SIZE) + 1);
  }

  const spotlightIndex = Math.max(
    0,
    facts.findIndex((f) => f.id === spotlightId),
  );
  const spotlightFact = facts[spotlightIndex] ?? null;

  // Entry numbers reflect submission order (oldest = #1), independent of the
  // net-score order `facts` is displayed in, so a fact's number doesn't
  // change as votes come in.
  const entryNumbers = new Map(
    [...facts]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((f, i) => [f.id, i + 1]),
  );

  const totalPages = Math.max(1, Math.ceil(facts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageFacts = facts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="mt-10 max-w-2xl">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">Fun Facts</h2>

      <div className="overflow-hidden rounded-md border border-neutral-800 bg-neutral-900">
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

        {spotlightFact ? (
          (() => {
            const fact = spotlightFact;
            const canEdit = currentUserId === fact.submittedById;
            const canDelete = canEdit || isAdmin;
            const canVote = signedIn && !canEdit;

            return (
              <div className="border-b border-neutral-800 bg-gradient-to-b from-red-950/20 to-transparent p-5 text-center">
                {editingId === fact.id ? (
                  <div className="mx-auto flex max-w-md flex-col gap-2 text-left">
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
                  <p className="text-lg text-neutral-100">&ldquo;{fact.content}&rdquo;</p>
                )}

                <p className="mt-2 text-xs text-neutral-500">
                  — {fact.submittedBy.username} · {formatDate(fact.createdAt)}
                  {wasEdited(fact) && " (edited)"}
                </p>

                <div className="mt-3 flex items-center justify-center gap-4">
                  {facts.length > 1 && (
                    <button
                      onClick={() => shiftSpotlight(-1)}
                      className="text-sm text-neutral-500 hover:text-neutral-300"
                    >
                      ‹ prev
                    </button>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => (canVote ? vote(fact.id, 1) : undefined)}
                      disabled={!canVote}
                      title={canEdit ? "You can't vote on your own fun fact" : undefined}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-base leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        fact.myVote === 1 ? "text-green-500" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      👍 <span className="text-sm">{fact.up}</span>
                    </button>
                    <button
                      onClick={() => (canVote ? vote(fact.id, -1) : undefined)}
                      disabled={!canVote}
                      title={canEdit ? "You can't vote on your own fun fact" : undefined}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-base leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        fact.myVote === -1 ? "text-red-500" : "text-neutral-500 hover:text-neutral-300"
                      }`}
                    >
                      👎 <span className="text-sm">{fact.down}</span>
                    </button>
                  </div>
                  {facts.length > 1 && (
                    <button
                      onClick={() => shiftSpotlight(1)}
                      className="text-sm text-neutral-500 hover:text-neutral-300"
                    >
                      next ›
                    </button>
                  )}
                </div>

                {(canEdit || canDelete) && editingId !== fact.id && (
                  <div className="mt-2 flex items-center justify-center gap-2">
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
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <p className="border-b border-neutral-800 p-5 text-center text-sm text-neutral-500">
            No fun facts yet. Be the first to add one.
          </p>
        )}

        {facts.length > 1 && (
          <button
            onClick={() => setShowList((v) => !v)}
            className="w-full border-t border-neutral-800 py-2 text-center text-xs text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
          >
            {showList ? "Hide fun facts list" : `Show all ${facts.length} fun facts →`}
          </button>
        )}

        {showList && facts.length > 0 && (
          <>
            <ul className="divide-y divide-neutral-800 border-t border-neutral-800">
              {pageFacts.map((fact) => (
                <li key={fact.id}>
                  <button
                    onClick={() => setSpotlightId(fact.id)}
                    className={`flex w-full flex-col gap-1 px-3 py-2 text-left text-sm transition hover:bg-neutral-800/50 ${
                      fact.id === spotlightId ? "bg-neutral-800/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="shrink-0 text-neutral-600">#{entryNumbers.get(fact.id)}</span>
                      <span className={fact.myVote === 1 ? "text-green-500" : "text-neutral-600"}>
                        👍 {fact.up}
                      </span>
                      <span className={fact.myVote === -1 ? "text-red-500" : "text-neutral-600"}>
                        👎 {fact.down}
                      </span>
                      <span className="shrink-0 font-medium text-neutral-100">{fact.submittedBy.username}</span>
                      <span className="ml-auto shrink-0 text-neutral-600">{formatDate(fact.createdAt)}</span>
                    </div>
                    <p className="text-neutral-300">{fact.content}</p>
                  </button>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 border-t border-neutral-800 py-2 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded border border-neutral-700 px-2 py-0.5 text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ‹
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`rounded border px-2 py-0.5 ${
                        n === currentPage
                          ? "border-red-700 bg-red-700 text-white"
                          : "border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded border border-neutral-700 px-2 py-0.5 text-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
