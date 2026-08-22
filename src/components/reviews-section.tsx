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
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function ReviewsSection({
  movieId,
  initialAdminReview,
  initialMemberReviews,
  signedIn,
  currentUserId,
  isAdmin,
}: {
  movieId: string;
  initialAdminReview: EditorialReviewData | null;
  initialMemberReviews: MemberReviewData[];
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

  // Member reviews -- one per (movie, member).
  const [memberReviews, setMemberReviews] = useState(initialMemberReviews);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  const myReview = memberReviews.find((r) => r.authorId === currentUserId) ?? null;

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
    setMemberReviews((prev) => [review, ...prev]);
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
    setMemberReviews((prev) => prev.map((r) => (r.id === id ? review : r)));
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
    setMemberReviews((prev) => prev.filter((r) => r.id !== id));
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
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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
      ) : (
        adminReview && (
          <div className="mb-6 rounded-md border border-amber-800/40 bg-amber-950/10 p-4">
            <p className="max-w-2xl whitespace-pre-wrap text-neutral-300">{adminReview.content}</p>
            <p className="mt-3 text-xs text-neutral-500">
              <span className="mr-2 rounded border border-amber-700 px-1.5 py-0.5 font-semibold text-amber-500">
                Admin Review
              </span>
              Reviewed by {adminReview.author.username} &middot; updated {formatDate(adminReview.updatedAt)}
            </p>
          </div>
        )
      )}

      {signedIn ? (
        !myReview && (
          <div className="mb-4">
            {showWriteForm ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                  maxLength={MAX_MEMBER_LENGTH}
                  placeholder="Write your review…"
                  className="w-full max-w-2xl rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
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

      {memberReviews.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {memberReviews.map((review) => {
            const canEdit = currentUserId === review.authorId;
            const canDelete = canEdit || isAdmin;

            return (
              <li key={review.id} className="border-t border-neutral-800 pt-4">
                {editingReviewId === review.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      maxLength={MAX_MEMBER_LENGTH}
                      className="w-full max-w-2xl rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveEdit(review.id)}
                        disabled={memberSubmitting || !editContent.trim()}
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
                  <p className="max-w-2xl whitespace-pre-wrap text-neutral-300">{review.content}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>
                    {review.author.username} &middot; {formatDate(review.createdAt)}
                  </span>
                  {(canEdit || canDelete) && editingReviewId !== review.id && (
                    <span className="inline-flex gap-2">
                      {canEdit && (
                        <button onClick={() => startEdit(review)} className="text-neutral-400 hover:text-white">
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => deleteReview(review.id)} className="text-neutral-400 hover:text-red-400">
                          Delete
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !adminReview && <p className="text-sm text-neutral-500">No reviews yet.</p>
      )}
    </section>
  );
}
