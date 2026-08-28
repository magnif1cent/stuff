"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RATING_CATEGORIES, type RatingCategoryKey } from "@/lib/rating-categories";
import { StarRatingPicker } from "@/components/star-rating-picker";

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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSave() {
    if (score === null) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/admin-rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, note }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRateCategory(category: RatingCategoryKey, value: number) {
    setSavingCategory(category);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/admin-rating/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, score: value }),
      });
      if (res.ok) {
        setCategoryScores((prev) => ({ ...prev, [category]: value }));
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSavingCategory(null);
    }
  }

  return (
    <div className="rounded-md border border-amber-800/50 bg-amber-950/20 p-3">
      <p className="font-cond mb-2 text-sm tracking-wide text-amber-500 uppercase">
        Editors&rsquo; Score <span className="normal-case">(admin only)</span>
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {SCORES.map((value) => (
          <button
            key={value}
            onClick={() => setScore(value)}
            className={`font-cond h-8 w-8 rounded-sm text-sm font-medium transition ${
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
        className="mb-2 w-full rounded-sm border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-amber-600 focus:outline-none"
        rows={2}
      />
      <button
        onClick={handleSave}
        disabled={saving || score === null}
        className="rounded-sm bg-amber-600 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save editors' rating"}
      </button>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Same progressive-reveal treatment as the member widget: category
          rows only appear once an overall score has been picked. */}
      {score !== null && (
        <>
          <p className="font-cond mt-3 mb-1 text-xs tracking-wide text-amber-500 uppercase">
            Rate by category <span className="normal-case">(optional)</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {RATING_CATEGORIES.map(({ key, label }) => {
              const categoryScore = categoryScores[key] ?? null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <p className="font-cond w-32 shrink-0 text-xs tracking-wide text-amber-200/70 uppercase">
                    {label}
                  </p>
                  <StarRatingPicker
                    value={categoryScore}
                    disabled={savingCategory === key}
                    onSelect={(value) => handleRateCategory(key, value)}
                    fillColorClassName="text-amber-500"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
