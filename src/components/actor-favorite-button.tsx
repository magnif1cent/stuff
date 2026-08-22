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

// Same one-tap toggle as FavoriteButton (fight scenes), scoped to a person
// instead -- an actor only ever gets a Favorite, no rating scale, mirroring
// why fight scenes don't get a Watchlist either.
export function ActorFavoriteButton({
  personId,
  initialFavorite,
  initialCount,
  signedIn,
}: {
  personId: string;
  initialFavorite: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setError(null);
    const res = await fetch(`/api/actors/${personId}/favorite`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { active, count: updatedCount } = await res.json();
    setFavorite(active);
    setCount(updatedCount);
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title={favorite ? "Favorited" : "Favorite this actor"}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm text-neutral-400 hover:border-neutral-500 hover:text-white ${
          favorite ? "border-red-600 bg-red-700 text-white hover:text-white" : "border-neutral-700"
        }`}
      >
        <HeartIcon filled={favorite} />
        {count}
      </button>
      {error && <p className="absolute left-0 top-full z-10 mt-1 w-40 text-xs text-red-500">{error}</p>}
    </div>
  );
}
