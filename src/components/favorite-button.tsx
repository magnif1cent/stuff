"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// A fight scene only ever gets a Favorite, not a Watchlist — unlike a
// movie, a scene is a short clip, not something to queue up for later.
export function FavoriteButton({
  movieId,
  fightSceneId,
  initialFavorite,
  signedIn,
}: {
  movieId: string;
  fightSceneId: string;
  initialFavorite: boolean;
  signedIn: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${fightSceneId}/favorite`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { active } = await res.json();
    setFavorite(active);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title={favorite ? "Favorited" : "Favorite"}
        className={`flex h-10 w-10 items-center justify-center rounded-md border text-neutral-400 hover:border-neutral-500 hover:text-white ${
          favorite ? "border-red-600 bg-red-700 text-white hover:text-white" : "border-neutral-700"
        }`}
      >
        <HeartIcon filled={favorite} />
      </button>
      {error && <p className="absolute right-0 top-full z-10 mt-1 w-40 text-xs text-red-500">{error}</p>}
    </div>
  );
}
