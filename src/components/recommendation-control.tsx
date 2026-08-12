"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecommendedBadges } from "@/components/recommended-badge";
import type { MovieRecommender } from "@/lib/movie-recommendations";

export function RecommendationControl({
  movieId,
  initialRecommenders,
  currentAdminId,
  isAdmin,
}: {
  movieId: string;
  initialRecommenders: MovieRecommender[];
  currentAdminId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [recommenders, setRecommenders] = useState(initialRecommenders);
  const [submitting, setSubmitting] = useState(false);
  const recommendedByMe = !!currentAdminId && recommenders.some((r) => r.id === currentAdminId);

  if (!isAdmin && recommenders.length === 0) return null;

  async function toggle() {
    setSubmitting(true);
    const res = await fetch(`/api/movies/${movieId}/recommend`, {
      method: recommendedByMe ? "DELETE" : "POST",
    });
    setSubmitting(false);
    if (!res.ok) return;
    const { recommenders: updated } = await res.json();
    setRecommenders(updated);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <RecommendedBadges recommenders={recommenders} size="md" />
      {isAdmin && (
        <button
          onClick={toggle}
          disabled={submitting}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
        >
          {recommendedByMe ? "✓ Recommended by you" : "+ Recommend this movie"}
        </button>
      )}
    </div>
  );
}
