"use client";

import { useState } from "react";
import type { MemberReviewData } from "@/components/reviews-section";

const MAX_MEMBER_LENGTH = 5000;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function MemberReviewListItem({
  review,
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
  review: MemberReviewData;
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
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={8}
            maxLength={MAX_MEMBER_LENGTH}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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
        <p className="whitespace-pre-wrap text-sm text-neutral-300">{review.content}</p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs">
        <button
          onClick={() => (canVote ? onVote(1) : undefined)}
          disabled={!canVote}
          title={canEdit ? "You can't vote on your own review" : undefined}
          className={`${review.myVote === 1 ? "text-green-500" : "text-neutral-500 hover:text-neutral-300"} disabled:cursor-not-allowed disabled:hover:text-neutral-500`}
        >
          👍 {review.up}
        </button>
        <button
          onClick={() => (canVote ? onVote(-1) : undefined)}
          disabled={!canVote}
          title={canEdit ? "You can't vote on your own review" : undefined}
          className={`${review.myVote === -1 ? "text-red-500" : "text-neutral-500 hover:text-neutral-300"} disabled:cursor-not-allowed disabled:hover:text-neutral-500`}
        >
          👎 {review.down}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>
          {review.author.username} &middot; {formatDate(review.createdAt)}
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

export function MemberReviewsList({
  movieId,
  initialReviews,
  signedIn,
  currentUserId,
  isAdmin,
}: {
  movieId: string;
  initialReviews: MemberReviewData[];
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(review: MemberReviewData) {
    setEditingReviewId(review.id);
    setEditContent(review.content);
    setError(null);
  }

  function cancelEdit() {
    setEditingReviewId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews/${id}`, {
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
    const { review } = await res.json();
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...review } : r)));
    cancelEdit();
  }

  async function deleteReview(id: string) {
    if (!window.confirm("Delete this review? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
  }

  async function vote(id: string, value: 1 | -1) {
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews/${id}/vote`, {
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
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, myVote, up, down } : r)));
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {reviews.map((review) => (
        <MemberReviewListItem
          key={review.id}
          review={review}
          canEdit={currentUserId === review.authorId}
          canDelete={currentUserId === review.authorId || isAdmin}
          canVote={signedIn && currentUserId !== review.authorId}
          isEditing={editingReviewId === review.id}
          editContent={editContent}
          submitting={submitting}
          onStartEdit={() => startEdit(review)}
          onEditContentChange={setEditContent}
          onSaveEdit={() => saveEdit(review.id)}
          onCancelEdit={cancelEdit}
          onDelete={() => deleteReview(review.id)}
          onVote={(value) => vote(review.id, value)}
        />
      ))}
    </div>
  );
}
