"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RATING_CATEGORIES, type RatingCategoryKey } from "@/lib/rating-categories";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

export function RatingWidget({
  movieId,
  initialScore,
  initialCategoryScores,
  signedIn,
}: {
  movieId: string;
  initialScore: number | null;
  initialCategoryScores?: Partial<Record<RatingCategoryKey, number>>;
  signedIn: boolean;
}) {
  const [score, setScore] = useState(initialScore);
  const [categoryScores, setCategoryScores] = useState(initialCategoryScores ?? {});
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState<RatingCategoryKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!signedIn) {
    return (
      <a href="/login" className="text-sm text-red-500 hover:underline">
        Sign in to rate this movie
      </a>
    );
  }

  async function handleRate(value: number) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: value }),
    });
    setSaving(false);
    if (res.ok) {
      setScore(value);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
    }
  }

  async function handleRateCategory(category: RatingCategoryKey, value: number) {
    setSavingCategory(category);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/rating/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, score: value }),
    });
    setSavingCategory(null);
    if (res.ok) {
      setCategoryScores((prev) => ({ ...prev, [category]: value }));
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm text-neutral-400">Your rating</p>
      <div className="flex flex-wrap gap-1">
        {SCORES.map((value) => (
          <button
            key={value}
            disabled={saving}
            onClick={() => handleRate(value)}
            className={`h-8 w-8 rounded text-sm font-medium transition disabled:opacity-50 ${
              score !== null && value <= score
                ? "bg-yellow-500 text-neutral-950"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      <p className="mt-4 mb-1 text-sm text-neutral-400">Rate by category (optional)</p>
      <div className="flex flex-col gap-2">
        {RATING_CATEGORIES.map(({ key, label }) => {
          const categoryScore = categoryScores[key] ?? null;
          return (
            <div key={key}>
              <p className="mb-1 text-xs text-neutral-500">{label}</p>
              <div className="flex flex-wrap gap-1">
                {SCORES.map((value) => (
                  <button
                    key={value}
                    disabled={savingCategory === key}
                    onClick={() => handleRateCategory(key, value)}
                    className={`h-6 w-6 rounded text-xs font-medium transition disabled:opacity-50 ${
                      categoryScore !== null && value <= categoryScore
                        ? "bg-yellow-500 text-neutral-950"
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
