"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

export function RatingWidget({
  movieId,
  initialScore,
  signedIn,
}: {
  movieId: string;
  initialScore: number | null;
  signedIn: boolean;
}) {
  const [score, setScore] = useState(initialScore);
  const [saving, setSaving] = useState(false);
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
    const res = await fetch(`/api/movies/${movieId}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: value }),
    });
    setSaving(false);
    if (res.ok) {
      setScore(value);
      router.refresh();
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
    </div>
  );
}
