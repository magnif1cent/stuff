"use client";

import { useState } from "react";
import type { PersonTribute as PersonTributeModel, User } from "@/generated/prisma/client";

const MAX_TRIBUTE_LENGTH = 5000;

type TributeAuthor = Pick<User, "username">;

// updatedAt/createdAt cross the server-to-client boundary as strings (JSON),
// same reasoning as MemberReviewData.
export type PersonTributeData = Pick<PersonTributeModel, "id" | "content" | "authorId"> & {
  createdAt: string;
  updatedAt: string;
  author: TributeAuthor;
  up: number;
  down: number;
  myVote: 1 | -1 | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Highest net score (up - down) first, ties broken by newest -- same
// ordering as ReviewsSection's byNetScore.
function byNetScore(a: PersonTributeData, b: PersonTributeData) {
  const scoreDiff = b.up - b.down - (a.up - a.down);
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// Same clamp threshold as MemberReviewCard.
const CARD_CLAMP_THRESHOLD = 160;

function PersonTributeCard({
  tribute,
  canEdit,
  canDelete,
  canVote,
  isEditing,
  editContent,
  submitting,
  onStartEdit,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onVote,
}: {
  tribute: PersonTributeData;
  canEdit: boolean;
  canDelete: boolean;
  canVote: boolean;
  isEditing: boolean;
  editContent: string;
  submitting: boolean;
  onStartEdit: () => void;
  onEditContentChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onVote: (value: 1 | -1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = tribute.content.length > CARD_CLAMP_THRESHOLD;

  return (
    <div className="w-72 shrink-0 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={6}
            maxLength={MAX_TRIBUTE_LENGTH}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={onSaveEdit}
              disabled={submitting || !editContent.trim()}
              className="w-fit rounded-md bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="w-fit rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className={`whitespace-pre-wrap text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-4" : ""}`}>
            {tribute.content}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-xs font-medium text-red-500 hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs">
        <button
          onClick={() => (canVote ? onVote(1) : undefined)}
          disabled={!canVote}
          title={canEdit ? "You can't vote on your own tribute" : undefined}
          className={`${tribute.myVote === 1 ? "text-green-500" : "text-neutral-500 hover:text-neutral-300"} disabled:cursor-not-allowed disabled:hover:text-neutral-500`}
        >
          👍 {tribute.up}
        </button>
        <button
          onClick={() => (canVote ? onVote(-1) : undefined)}
          disabled={!canVote}
          title={canEdit ? "You can't vote on your own tribute" : undefined}
          className={`${tribute.myVote === -1 ? "text-red-500" : "text-neutral-500 hover:text-neutral-300"} disabled:cursor-not-allowed disabled:hover:text-neutral-500`}
        >
          👎 {tribute.down}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>
          {tribute.author.username} &middot; {formatDate(tribute.createdAt)}
        </span>
        {(canEdit || canDelete) && !isEditing && (
          <span className="inline-flex gap-2">
            {canEdit && (
              <button onClick={onStartEdit} className="text-neutral-400 hover:text-white">
                Edit
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="text-neutral-400 hover:text-red-400">
                Delete
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export function ActorTributesSection({
  personId,
  initialTributes,
  tributesCount,
  hasOwnTribute,
  signedIn,
  currentUserId,
  isAdmin,
}: {
  personId: string;
  initialTributes: PersonTributeData[];
  tributesCount: number;
  hasOwnTribute: boolean;
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [tributes, setTributes] = useState(initialTributes);
  const [count, setCount] = useState(tributesCount);
  const [hasTribute, setHasTribute] = useState(hasOwnTribute);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingTributeId, setEditingTributeId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitNewTribute() {
    if (!newContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/actors/${personId}/tributes`, {
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
    const { tribute } = await res.json();
    const withVotes: PersonTributeData = { ...tribute, up: 0, down: 0, myVote: null };
    setTributes((prev) => [withVotes, ...prev].sort(byNetScore).slice(0, initialTributes.length || 2));
    setCount((c) => c + 1);
    setHasTribute(true);
    setNewContent("");
    setShowWriteForm(false);
  }

  function startEdit(tribute: PersonTributeData) {
    setEditingTributeId(tribute.id);
    setEditContent(tribute.content);
    setError(null);
  }

  function cancelEdit() {
    setEditingTributeId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/actors/${personId}/tributes/${id}`, {
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
    const { tribute } = await res.json();
    setTributes((prev) => prev.map((t) => (t.id === id ? { ...t, ...tribute } : t)));
    cancelEdit();
  }

  async function deleteTribute(id: string) {
    if (!window.confirm("Delete this tribute? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/actors/${personId}/tributes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const wasMine = tributes.find((t) => t.id === id)?.authorId === currentUserId;
    setTributes((prev) => prev.filter((t) => t.id !== id));
    setCount((c) => Math.max(0, c - 1));
    if (wasMine) setHasTribute(false);
  }

  async function vote(id: string, value: 1 | -1) {
    setError(null);
    const res = await fetch(`/api/actors/${personId}/tributes/${id}/vote`, {
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
    setTributes((prev) => prev.map((t) => (t.id === id ? { ...t, myVote, up, down } : t)).sort(byNetScore));
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-bold text-white">Tributes</h2>

      {signedIn ? (
        !hasTribute && (
          <div className="mb-4">
            {showWriteForm ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                  maxLength={MAX_TRIBUTE_LENGTH}
                  placeholder="Write a tribute to their career, or a performance you loved…"
                  className="w-full max-w-2xl rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={submitNewTribute}
                    disabled={submitting || !newContent.trim()}
                    className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {submitting ? "Posting…" : "Post tribute"}
                  </button>
                  <button
                    onClick={() => {
                      setShowWriteForm(false);
                      setNewContent("");
                    }}
                    className="w-fit rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                  >
                    Cancel
                  </button>
                  <span className="text-xs text-neutral-500">
                    {newContent.length}/{MAX_TRIBUTE_LENGTH}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWriteForm(true)}
                className="w-fit rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Write a tribute
              </button>
            )}
          </div>
        )
      ) : (
        <p className="mb-4 text-sm text-neutral-400">
          <a href="/login" className="text-red-500 hover:underline">
            Sign in
          </a>{" "}
          to write a tribute.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {tributes.length > 0 ? (
        <>
          <div className="rail-scrollbar flex gap-4 overflow-x-auto pb-2">
            {tributes.map((tribute) => (
              <PersonTributeCard
                key={tribute.id}
                tribute={tribute}
                canEdit={currentUserId === tribute.authorId}
                canDelete={currentUserId === tribute.authorId || isAdmin}
                canVote={signedIn && currentUserId !== tribute.authorId}
                isEditing={editingTributeId === tribute.id}
                editContent={editContent}
                submitting={submitting}
                onStartEdit={() => startEdit(tribute)}
                onEditContentChange={setEditContent}
                onSaveEdit={() => saveEdit(tribute.id)}
                onCancelEdit={cancelEdit}
                onDelete={() => deleteTribute(tribute.id)}
                onVote={(value) => vote(tribute.id, value)}
              />
            ))}
          </div>
          {count > tributes.length && (
            <a
              href={`/actors/${personId}/tributes`}
              className="mt-3 inline-block text-sm text-red-500 hover:underline"
            >
              View all {count} tributes →
            </a>
          )}
        </>
      ) : (
        <p className="text-sm text-neutral-500">No tributes yet. Be the first to pay one.</p>
      )}
    </section>
  );
}
