"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonSpotlight as PersonSpotlightModel, User } from "@/generated/prisma/client";

const MAX_SPOTLIGHT_LENGTH = 1000;

type SpotlightAuthor = Pick<User, "username">;

export type PersonSpotlightData = Pick<PersonSpotlightModel, "content"> & {
  updatedAt: string;
  author: SpotlightAuthor;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Admin-only curated blurb, same relationship to Person that EditorialReview
// has to Movie -- one shared row, any admin can write/update it. Its
// presence also doubles as the "Editor's Spotlight" badge shown here.
export function ActorSpotlight({
  personId,
  initialSpotlight,
  isAdmin,
}: {
  personId: string;
  initialSpotlight: PersonSpotlightData | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [spotlight, setSpotlight] = useState(initialSpotlight);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialSpotlight?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin && !spotlight) return null;

  async function save() {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/actors/${personId}/spotlight`, {
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
    const { spotlight: saved } = await res.json();
    setSpotlight(saved);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this actor's Editor's Spotlight? This can't be undone.")) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/actors/${personId}/spotlight`, { method: "DELETE" });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setSpotlight(null);
    router.refresh();
  }

  return (
    <section className="mb-8">
      {isAdmin && !editing && (
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => {
              setDraft(spotlight?.content ?? "");
              setEditing(true);
            }}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            {spotlight ? "Edit Editor's Spotlight" : "+ Add to Editor's Spotlight"}
          </button>
          {spotlight && (
            <button
              onClick={remove}
              disabled={submitting}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={MAX_SPOTLIGHT_LENGTH}
            placeholder="Why does this actor matter?"
            className="w-full max-w-2xl rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={save}
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
              {draft.length}/{MAX_SPOTLIGHT_LENGTH}
            </span>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      ) : (
        spotlight && (
          <div className="rounded-md border border-amber-800/40 bg-amber-950/10 p-4">
            <p className="max-w-2xl whitespace-pre-wrap text-neutral-300">{spotlight.content}</p>
            <p className="mt-3 text-xs text-neutral-500">
              <span className="mr-2 rounded border border-amber-700 px-1.5 py-0.5 font-semibold text-amber-500">
                Editor&apos;s Spotlight
              </span>
              Curated by {spotlight.author.username} &middot; updated {formatDate(spotlight.updatedAt)}
            </p>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
        )
      )}
    </section>
  );
}
