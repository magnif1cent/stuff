"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RATING_CATEGORIES, type RatingCategoryKey } from "@/lib/rating-categories";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

export function AdminRatingWidget({
  movieId,
  initialScore,
  initialNote,
  initialCategoryScores,
}: {
  movieId: string;
  initialScore: number | null;
  initialNote: string | null;
  initialCategoryScores?: Partial<Record<RatingCategoryKey, number>>;
}) {
  const [score, setScore] = useState(initialScore);
  const [note, setNote] = useState(initialNote ?? "");
  const [categoryScores, setCategoryScores] = useState(initialCategoryScores ?? {});
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState<RatingCategoryKey | null>(null);
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

  async function handleRateCategory(category: RatingCategoryKey, value: number) {
    setSavingCategory(category);
    const res = await fetch(`/api/movies/${movieId}/admin-rating/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, score: value }),
    });
    setSavingCategory(null);
    if (res.ok) {
      setCategoryScores((prev) => ({ ...prev, [category]: value }));
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

      <p className="mt-3 mb-1 text-xs font-semibold text-amber-500">Rate by category (optional)</p>
      <div className="flex flex-col gap-2">
        {RATING_CATEGORIES.map(({ key, label }) => {
          const categoryScore = categoryScores[key] ?? null;
          return (
            <div key={key}>
              <p className="mb-1 text-xs text-amber-200/70">{label}</p>
              <div className="flex flex-wrap gap-1">
                {SCORES.map((value) => (
                  <button
                    key={value}
                    disabled={savingCategory === key}
                    onClick={() => handleRateCategory(key, value)}
                    className={`h-6 w-6 rounded text-xs font-medium transition disabled:opacity-50 ${
                      categoryScore !== null && value <= categoryScore
                        ? "bg-amber-500 text-neutral-950"
                        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
