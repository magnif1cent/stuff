"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EditorialReview as EditorialReviewModel, User } from "@/generated/prisma/client";

const MAX_LENGTH = 10000;

type ReviewAuthor = Pick<User, "username">;

// updatedAt crosses the server-to-client boundary as a string (JSON), same
// reasoning as DiscussionThread/FightSceneSection.
export type EditorialReviewData = Pick<EditorialReviewModel, "content"> & {
  updatedAt: string;
  author: ReviewAuthor;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function EditorialReview({
  movieId,
  initialReview,
  isAdmin,
}: {
  movieId: string;
  initialReview: EditorialReviewData | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [review, setReview] = useState(initialReview);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialReview?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/editorial-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { review: saved } = await res.json();
    setReview(saved);
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Editor&rsquo;s Review</h2>
        {isAdmin && !editing && (
          <button
            onClick={() => {
              setDraft(review?.content ?? "");
              setEditing(true);
            }}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            {review ? "Edit" : "Write a review"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            maxLength={MAX_LENGTH}
            placeholder="Write the editorial review…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={submitting || !draft.trim()}
              className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="w-fit rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <span className="text-xs text-neutral-500">
              {draft.length}/{MAX_LENGTH}
            </span>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      ) : review ? (
        <div>
          <p className="max-w-2xl whitespace-pre-wrap text-neutral-300">{review.content}</p>
          <p className="mt-3 text-xs text-neutral-500">
            Reviewed by {review.author.username} &middot; updated {formatDate(review.updatedAt)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No review yet.</p>
      )}
    </section>
  );
}
