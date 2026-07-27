"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

export function AdminRatingWidget({
  movieId,
  initialScore,
  initialNote,
}: {
  movieId: string;
  initialScore: number | null;
  initialNote: string | null;
}) {
  const [score, setScore] = useState(initialScore);
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave() {
    if (score === null) return;
    setSaving(true);
    const res = await fetch(`/api/movies/${movieId}/admin-rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, note }),
    });
    setSaving(false);
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3">
      <p className="mb-2 text-sm font-semibold text-amber-500">Editors&rsquo; Score (admin only)</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {SCORES.map((value) => (
          <button
            key={value}
            onClick={() => setScore(value)}
            className={`h-8 w-8 rounded text-sm font-medium transition ${
              score !== null && value <= score
                ? "bg-amber-500 text-neutral-950"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Editor's note (optional)"
        className="mb-2 w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-amber-600 focus:outline-none"
        rows={2}
      />
      <button
        onClick={handleSave}
        disabled={saving || score === null}
        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save editors' rating"}
      </button>
    </div>
  );
}
