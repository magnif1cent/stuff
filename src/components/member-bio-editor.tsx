"use client";

import { useState } from "react";
import { BIO_MAX_LENGTH } from "@/lib/profile";

export function MemberBioEditor({ initialBio }: { initialBio: string | null }) {
  const [bio, setBio] = useState(initialBio);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialBio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (draft.trim().length > BIO_MAX_LENGTH) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile/bio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: draft }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setBio(body.bio);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-6">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Tell other members a bit about yourself…"
          className="w-full max-w-xl resize-none rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <div className="mt-1 flex items-center gap-3">
          <span className={`text-xs ${draft.trim().length > BIO_MAX_LENGTH ? "text-red-500" : "text-neutral-500"}`}>
            {draft.trim().length}/{BIO_MAX_LENGTH}
          </span>
          <button
            onClick={save}
            disabled={saving || draft.trim().length > BIO_MAX_LENGTH}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setDraft(bio ?? "");
              setEditing(false);
              setError(null);
            }}
            className="text-sm text-neutral-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-3">
      {bio ? (
        <p className="max-w-xl text-sm whitespace-pre-wrap text-neutral-300">{bio}</p>
      ) : (
        <p className="text-sm text-neutral-500 italic">No bio yet.</p>
      )}
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 text-xs text-neutral-400 hover:text-white"
      >
        {bio ? "Edit" : "Add a bio"}
      </button>
    </div>
  );
}
