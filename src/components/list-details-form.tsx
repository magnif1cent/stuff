"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MEMBER_LIST_DESCRIPTION_MAX_LENGTH,
  MEMBER_LIST_NAME_MAX_LENGTH,
} from "@/lib/member-lists";

export function ListDetailsForm({
  listId,
  initialName,
  initialDescription,
  initialIsRanked,
}: {
  listId: string;
  initialName: string;
  initialDescription: string | null;
  initialIsRanked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isRanked, setIsRanked] = useState(initialIsRanked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, isRanked }),
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
      >
        ✎ Edit list
      </button>
    );
  }

  return (
    <form onSubmit={save} className="w-full max-w-md rounded-md border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3">
        <label className="mb-1 block text-xs tracking-wide text-neutral-500 uppercase">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MEMBER_LIST_NAME_MAX_LENGTH}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs tracking-wide text-neutral-500 uppercase">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MEMBER_LIST_DESCRIPTION_MAX_LENGTH}
          rows={3}
          className="w-full resize-y rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <p className="mt-1 text-right font-mono text-xs text-neutral-600">
          {description.length} / {MEMBER_LIST_DESCRIPTION_MAX_LENGTH}
        </p>
      </div>
      <label className="mb-4 flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm text-neutral-100">Ranked list</span>
          <span className="block text-xs text-neutral-500">
            Numbers your items 1–N and lets you reorder them. Off shows the plain grid, movies then fight scenes,
            like before.
          </span>
        </span>
        <input
          type="checkbox"
          checked={isRanked}
          onChange={(e) => setIsRanked(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-red-600"
        />
      </label>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-neutral-700 px-4 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
