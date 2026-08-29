"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EditorialReview as EditorialReviewModel, MemberReview as MemberReviewModel, User } from "@/generated/prisma/client";

const MAX_ADMIN_LENGTH = 10000;
const MAX_MEMBER_LENGTH = 5000;

type ReviewAuthor = Pick<User, "username">;

// updatedAt/createdAt cross the server-to-client boundary as strings (JSON),
// same reasoning as DiscussionThread/FightSceneSection.
export type EditorialReviewData = Pick<EditorialReviewModel, "content"> & {
  updatedAt: string;
  author: ReviewAuthor;
};

export type MemberReviewData = Pick<MemberReviewModel, "id" | "content" | "authorId"> & {
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthor;
  up: number;
  down: number;
  myVote: 1 | -1 | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Highest net score (up - down) first, ties broken by newest -- same
// ordering FunFactsSection uses, kept consistent client-side after a vote or
// a new submission reshuffles the two cards shown here.
function byNetScore(a: MemberReviewData, b: MemberReviewData) {
  const scoreDiff = b.up - b.down - (a.up - a.down);
  if (scoreDiff !== 0) return scoreDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// Below this length a review reads fine in full within the card without a
// toggle -- same reasoning as RecentReviewsFeed's CLAMP_THRESHOLD, scaled
// down further since these cards (w-72) are narrower than that feed's grid.
const CARD_CLAMP_THRESHOLD = 160;

function AdminReviewCard({
  review,
  canEdit,
  onStartEdit,
}: {
  review: EditorialReviewData;
  canEdit: boolean;
  onStartEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.content.length > CARD_CLAMP_THRESHOLD;

  return (
    <div className="w-72 shrink-0 rounded-md border border-amber-800/40 bg-amber-950/10 p-3">
      <p className={`whitespace-pre-wrap text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-4" : ""}`}>
        {review.content}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-red-500 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span className="rounded border border-amber-700 px-1.5 py-0.5 font-semibold text-amber-500">
          Admin Review
        </span>
        <span>
          {review.author.username} &middot; updated {formatDate(review.updatedAt)}
        </span>
        {canEdit && (
          <button onClick={onStartEdit} className="text-neutral-400 hover:text-white">
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function MemberReviewCard({
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
  const [expanded, setExpanded] = useState(false);
  const isLong = review.content.length > CARD_CLAMP_THRESHOLD;

  return (
    <div className="w-72 shrink-0 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            rows={6}
            maxLength={MAX_MEMBER_LENGTH}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-base text-neutral-100 focus:border-red-600 focus:outline-none"
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
            {review.content}
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

export function ReviewsSection({
  movieId,
  initialAdminReview,
  initialMemberReviews,
  memberReviewsCount,
  hasOwnReview,
  signedIn,
  currentUserId,
  isAdmin,
}: {
  movieId: string;
  initialAdminReview: EditorialReviewData | null;
  initialMemberReviews: MemberReviewData[];
  memberReviewsCount: number;
  hasOwnReview: boolean;
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();

  // Admin review -- one shared row per movie, same as before.
  const [adminReview, setAdminReview] = useState(initialAdminReview);
  const [editingAdmin, setEditingAdmin] = useState(false);
  const [adminDraft, setAdminDraft] = useState(initialAdminReview?.content ?? "");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Member reviews -- only the top MEMBER_REVIEWS_PREVIEW_COUNT (by vote
  // score) show here; the rest live on the /movies/[id]/reviews page.
  const [memberReviews, setMemberReviews] = useState(initialMemberReviews);
  const [reviewsCount, setReviewsCount] = useState(memberReviewsCount);
  const [hasReviewed, setHasReviewed] = useState(hasOwnReview);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  async function handleSaveAdmin() {
    if (!adminDraft.trim()) return;
    setAdminSubmitting(true);
    setAdminError(null);
    const res = await fetch(`/api/movies/${movieId}/editorial-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: adminDraft }),
    });
    setAdminSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setAdminError(body.error ?? "Something went wrong.");
      return;
    }
    const { review: saved } = await res.json();
    setAdminReview(saved);
    setEditingAdmin(false);
    router.refresh();
  }

  async function submitNewReview() {
    if (!newContent.trim()) return;
    setMemberSubmitting(true);
    setMemberError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    setMemberSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMemberError(body.error ?? "Something went wrong.");
      return;
    }
    const { review } = await res.json();
    const withVotes: MemberReviewData = { ...review, up: 0, down: 0, myVote: null };
    setMemberReviews((prev) => [withVotes, ...prev].sort(byNetScore).slice(0, initialMemberReviews.length || 2));
    setReviewsCount((c) => c + 1);
    setHasReviewed(true);
    setNewContent("");
    setShowWriteForm(false);
  }

  function startEdit(review: MemberReviewData) {
    setEditingReviewId(review.id);
    setEditContent(review.content);
    setMemberError(null);
  }

  function cancelEdit() {
    setEditingReviewId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setMemberSubmitting(true);
    setMemberError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setMemberSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMemberError(body.error ?? "Something went wrong.");
      return;
    }
    const { review } = await res.json();
    setMemberReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...review } : r)));
    cancelEdit();
  }

  async function deleteReview(id: string) {
    if (!window.confirm("Delete this review? This can't be undone.")) return;
    setMemberError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMemberError(body.error ?? "Something went wrong.");
      return;
    }
    const wasMine = memberReviews.find((r) => r.id === id)?.authorId === currentUserId;
    setMemberReviews((prev) => prev.filter((r) => r.id !== id));
    setReviewsCount((c) => Math.max(0, c - 1));
    if (wasMine) setHasReviewed(false);
  }

  async function vote(id: string, value: 1 | -1) {
    setMemberError(null);
    const res = await fetch(`/api/movies/${movieId}/reviews/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMemberError(body.error ?? "Something went wrong.");
      return;
    }
    const { myVote, up, down } = await res.json();
    setMemberReviews((prev) => prev.map((r) => (r.id === id ? { ...r, myVote, up, down } : r)).sort(byNetScore));
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Reviews</h2>
        {isAdmin && !editingAdmin && (
          <button
            onClick={() => {
              setAdminDraft(adminReview?.content ?? "");
              setEditingAdmin(true);
            }}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            {adminReview ? "Edit admin review" : "Write admin review"}
          </button>
        )}
      </div>

      {editingAdmin ? (
        <div className="mb-6 flex flex-col gap-2">
          <textarea
            value={adminDraft}
            onChange={(e) => setAdminDraft(e.target.value)}
            rows={10}
            maxLength={MAX_ADMIN_LENGTH}
            placeholder="Write the admin review…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAdmin}
              disabled={adminSubmitting || !adminDraft.trim()}
              className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {adminSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditingAdmin(false)}
              className="w-fit rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <span className="text-xs text-neutral-500">
              {adminDraft.length}/{MAX_ADMIN_LENGTH}
            </span>
          </div>
          {adminError && <p className="text-sm text-red-500">{adminError}</p>}
        </div>
      ) : null}

      {signedIn ? (
        !hasReviewed && (
          <div className="mb-4">
            {showWriteForm ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                  maxLength={MAX_MEMBER_LENGTH}
                  placeholder="Write your review…"
                  className="w-full max-w-2xl rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={submitNewReview}
                    disabled={memberSubmitting || !newContent.trim()}
                    className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {memberSubmitting ? "Posting…" : "Post review"}
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
                    {newContent.length}/{MAX_MEMBER_LENGTH}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowWriteForm(true)}
                className="w-fit rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Write a review
              </button>
            )}
          </div>
        )
      ) : (
        <p className="mb-4 text-sm text-neutral-400">
          <a href="/login" className="text-red-500 hover:underline">
            Sign in
          </a>{" "}
          to write a review.
        </p>
      )}

      {memberError && <p className="mb-4 text-sm text-red-500">{memberError}</p>}

      {(adminReview && !editingAdmin) || memberReviews.length > 0 ? (
        <>
          <div className="rail-scrollbar flex gap-4 overflow-x-auto pb-2">
            {adminReview && !editingAdmin && (
              <AdminReviewCard
                review={adminReview}
                canEdit={isAdmin}
                onStartEdit={() => {
                  setAdminDraft(adminReview.content);
                  setEditingAdmin(true);
                }}
              />
            )}
            {memberReviews.map((review) => (
              <MemberReviewCard
                key={review.id}
                review={review}
                canEdit={currentUserId === review.authorId}
                canDelete={currentUserId === review.authorId || isAdmin}
                canVote={signedIn && currentUserId !== review.authorId}
                isEditing={editingReviewId === review.id}
                editContent={editContent}
                submitting={memberSubmitting}
                onStartEdit={() => startEdit(review)}
                onEditContentChange={setEditContent}
                onSaveEdit={() => saveEdit(review.id)}
                onCancelEdit={cancelEdit}
                onDelete={() => deleteReview(review.id)}
                onVote={(value) => vote(review.id, value)}
              />
            ))}
          </div>
          {reviewsCount > memberReviews.length && (
            <a
              href={`/movies/${movieId}/reviews`}
              className="mt-3 inline-block text-sm text-red-500 hover:underline"
            >
              View all {reviewsCount} reviews →
            </a>
          )}
        </>
      ) : (
        !adminReview && <p className="text-sm text-neutral-500">No reviews yet.</p>
      )}
    </section>
  );
}
