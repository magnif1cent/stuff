"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ListButtons({
  movieId,
  initialFavorite,
  initialWatchlist,
  signedIn,
}: {
  movieId: string;
  initialFavorite: boolean;
  initialWatchlist: boolean;
  signedIn: boolean;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function toggle(listType: "FAVORITE" | "WATCHLIST") {
    if (!signedIn) {
      window.location.href = "/login";
      return;
    }
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listType }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { active } = await res.json();
    if (listType === "FAVORITE") setFavorite(active);
    else setWatchlist(active);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => toggle("FAVORITE")}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            favorite
              ? "border-red-600 bg-red-700 text-white"
              : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          {favorite ? "★ Favorited" : "☆ Favorite"}
        </button>
        <button
          onClick={() => toggle("WATCHLIST")}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
            watchlist
              ? "border-blue-600 bg-blue-700 text-white"
              : "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          {watchlist ? "✓ On Watchlist" : "+ Watchlist"}
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
