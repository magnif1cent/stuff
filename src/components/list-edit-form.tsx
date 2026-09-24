"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MemberList } from "@/generated/prisma/client";
import { MEMBER_LIST_DESCRIPTION_MAX_LENGTH, MEMBER_LIST_NAME_MAX_LENGTH } from "@/lib/member-lists";

// The list's /edit page. Ranking lives here with name and description
// rather than as a checkbox above the item rows: it's set once, not
// flipped on every visit, so it doesn't earn space on the list page itself.
export function ListEditForm({
  list,
  ownerUsername,
}: {
  list: Pick<MemberList, "id" | "name" | "description" | "isRanked">;
  ownerUsername: string;
}) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [isRanked, setIsRanked] = useState(list.isRanked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  // Delete lives here as well as in the desktop side panel: the phone
  // layout's button row leaves it out, so this is its only place there.
  async function deleteList() {
    if (!window.confirm("Delete this list? This can't be undone.")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/lists/${list.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't delete this list.");
      return;
    }
    router.push(`/members/${ownerUsername}`);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, isRanked }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaving(false);
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.push(`/lists/${list.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="list-name" className="text-xs tracking-wide text-neutral-500 uppercase">
          Name
        </label>
        <input
          id="list-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MEMBER_LIST_NAME_MAX_LENGTH}
          className="min-h-11 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="list-description" className="text-xs tracking-wide text-neutral-500 uppercase">
          Description
        </label>
        <textarea
          id="list-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={MEMBER_LIST_DESCRIPTION_MAX_LENGTH}
          rows={3}
          className="resize-y rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <p className="text-right font-mono text-xs text-neutral-600">
          {description.length} / {MEMBER_LIST_DESCRIPTION_MAX_LENGTH}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span id="list-ranked-label" className="text-sm font-semibold text-white">
            Ranked list
          </span>
          <span className="text-xs text-neutral-500">
            {isRanked ? "Items are numbered and can be reordered." : "Turn on to number each item and reorder them."}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isRanked}
          aria-labelledby="list-ranked-label"
          onClick={() => setIsRanked((v) => !v)}
          className={`relative h-[26px] w-11 shrink-0 rounded-full transition ${isRanked ? "bg-red-700" : "bg-neutral-700"}`}
        >
          <span
            className={`absolute top-[3px] h-5 w-5 rounded-full bg-neutral-100 transition-all ${isRanked ? "left-[21px]" : "left-[3px]"}`}
          />
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="min-h-11 rounded-md bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <Link
          href={`/lists/${list.id}`}
          className="inline-flex min-h-11 items-center rounded-md border border-neutral-700 px-4 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Cancel
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-1.5 border-t border-neutral-800 pt-5">
        <button
          type="button"
          onClick={deleteList}
          disabled={deleting}
          className="min-h-11 rounded-md border border-red-900 text-sm text-red-400 hover:bg-red-950/40 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete this list…"}
        </button>
        <p className="text-center text-xs text-neutral-500">Deleting can&rsquo;t be undone.</p>
      </div>
    </form>
  );
}
