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

  async function toggle() {
    setSaving(true);
    setError(null);
    const next = !isRanked;
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
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
      <p className="text-xs text-neutral-400">
        {isRanked
          ? "Ranked — numbered by your order, reorder with the ↑↓ on each item."
          : "Not ranked — items are just sorted by when added."}
      </p>
      <button
        onClick={toggle}
        disabled={saving}
        className="shrink-0 text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
      >
        {saving ? "Saving…" : isRanked ? "Turn off ranking" : "Rank this list"}
      </button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </div>
  );
}
