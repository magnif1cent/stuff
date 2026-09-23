"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberList } from "@/generated/prisma/client";

type ListFlag = keyof Pick<MemberList, "isRanked" | "isPrivate">;

// One owner-only checkbox that PATCHes a single boolean on the list and
// refreshes the page — shared by the ranking and privacy toggles below.
function ListFlagToggle({
  listId,
  flag,
  initialValue,
  label,
  hint,
  errorMessage,
}: {
  listId: string;
  flag: ListFlag;
  initialValue: boolean;
  label: string;
  hint: string;
  errorMessage: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? errorMessage);
      return;
    }
    setValue(next);
    router.refresh();
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={value}
          disabled={saving}
          onChange={toggle}
          className="h-4 w-4 accent-red-600"
        />
        <span className="text-sm font-medium text-neutral-100">{label}</span>
      </label>
      <span className="text-xs text-neutral-500">{saving ? "Saving…" : hint}</span>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </div>
  );
}

// A fast path for the same isRanked flag ListDetailsForm's "Rank my list"
// pill controls — sits directly above the item rows so the owner can flip
// ranking on or off without leaving the page to open the Edit list panel.
// The fuller panel (with its before/after explanation) still exists for
// first-time understanding; this is for once you already know what it does.
export function ListRankToggle({ listId, initialIsRanked }: { listId: string; initialIsRanked: boolean }) {
  return (
    <ListFlagToggle
      listId={listId}
      flag="isRanked"
      initialValue={initialIsRanked}
      label="Ranked list"
      hint="Show a rank number for each item and enable reordering."
      errorMessage="Couldn't update ranking."
    />
  );
}

export function ListPrivacyToggle({ listId, initialIsPrivate }: { listId: string; initialIsPrivate: boolean }) {
  return (
    <ListFlagToggle
      listId={listId}
      flag="isPrivate"
      initialValue={initialIsPrivate}
      label="Private list"
      hint={
        initialIsPrivate
          ? "Only you can see this list. Uncheck to make it public again."
          : "Hide this list from everyone but you. It won't show on /lists, your profile, or the leaderboard."
      }
      errorMessage="Couldn't update privacy."
    />
  );
}
