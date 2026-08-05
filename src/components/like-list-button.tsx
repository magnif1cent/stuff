"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LikeListButton({
  listId,
  initialLiked,
  initialLikeCount,
  canLike,
}: {
  listId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  canLike: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle() {
    if (!canLike) {
      window.location.href = "/login";
      return;
    }
    setError(null);
    const res = await fetch(`/api/lists/${listId}/like`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { active, likeCount: count } = await res.json();
    setLiked(active);
    setLikeCount(count);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggle}
        className={`w-fit rounded-md border px-3 py-1.5 text-sm font-medium transition ${
          liked
            ? "border-red-600 bg-red-700 text-white"
            : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
        }`}
      >
        {liked ? "♥ Liked" : "♡ Like"} {likeCount > 0 && `(${likeCount})`}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
