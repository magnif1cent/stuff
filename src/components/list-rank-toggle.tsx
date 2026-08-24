"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// A fast path for the same isRanked flag ListDetailsForm's "Rank my list"
// pill controls — sits directly above the item rows so the owner can flip
// ranking on or off without leaving the page to open the Edit list panel.
// The fuller panel (with its before/after explanation) still exists for
// first-time understanding; this is for once you already know what it does.
export function ListRankToggle({ listId, initialIsRanked }: { listId: string; initialIsRanked: boolean }) {
  const [isRanked, setIsRanked] = useState(initialIsRanked);
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
      body: JSON.stringify({ isRanked: next }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't update ranking.");
      return;
    }
    setIsRanked(next);
    router.refresh();
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={isRanked}
          disabled={saving}
          onChange={toggle}
          className="h-4 w-4 accent-red-600"
        />
        <span className="text-sm font-medium text-neutral-100">Ranked list</span>
      </label>
      <span className="text-xs text-neutral-500">
        {saving ? "Saving…" : "Show a rank number for each item and enable reordering."}
      </span>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </div>
  );
}
