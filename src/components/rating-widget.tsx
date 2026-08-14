"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RATING_CATEGORIES, type RatingCategoryKey } from "@/lib/rating-categories";
import { StarRatingPicker } from "@/components/star-rating-picker";

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
    try {
      const res = await fetch(`/api/movies/${movieId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: value }),
      });
      if (res.ok) {
        setScore(value);
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
      const res = await fetch(`/api/movies/${movieId}/rating/category`, {
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

      {/* Only rendered once a member has rated overall — keeps the widget
          from front-loading three more picker rows before someone's done
          the one thing most visitors come to do. */}
      {score !== null && (
        <>
          <p className="mt-4 mb-1 text-sm text-neutral-400">Rate by category (optional)</p>
          <div className="flex flex-col gap-1.5">
            {RATING_CATEGORIES.map(({ key, label }) => {
              const categoryScore = categoryScores[key] ?? null;
              return (
                <div key={key} className="flex items-center gap-3">
                  <p className="w-32 shrink-0 text-xs text-neutral-500">{label}</p>
                  <StarRatingPicker
                    value={categoryScore}
                    disabled={savingCategory === key}
                    onSelect={(value) => handleRateCategory(key, value)}
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
